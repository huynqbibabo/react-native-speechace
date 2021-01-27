#import "Speechace.h"
#import "RCTConvert.h"

@implementation Speechace

RCT_EXPORT_MODULE()

- (instancetype)init
{
    self = [super init];
    _recordState.mDataFormat.mSampleRate        = 16000; // 44100;
    _recordState.mDataFormat.mBitsPerChannel    = 16; // 8|16
    _recordState.mDataFormat.mChannelsPerFrame  = 1;
    _recordState.mDataFormat.mBytesPerPacket    = (_recordState.mDataFormat.mBitsPerChannel / 8) * _recordState.mDataFormat.mChannelsPerFrame;
    _recordState.mDataFormat.mBytesPerFrame     = _recordState.mDataFormat.mBytesPerPacket;
    _recordState.mDataFormat.mFramesPerPacket   = 1;
    _recordState.mDataFormat.mReserved          = 0;
    _recordState.mDataFormat.mFormatID          = kAudioFormatLinearPCM;
    _recordState.mDataFormat.mFormatFlags       = _recordState.mDataFormat.mBitsPerChannel == 8 ? kLinearPCMFormatFlagIsPacked : (kLinearPCMFormatFlagIsSignedInteger | kLinearPCMFormatFlagIsPacked);
    
    _recordState.bufferByteSize = 2048;
    _recordState.mSelf = self;
    _state = StateNone;
    return self;
}

RCT_EXPORT_METHOD(setApiKey:(NSString *)key) {
    _apiKey = key;
}

RCT_EXPORT_METHOD(start:(NSDictionary *)params formData:(NSDictionary *)formData configs:(NSDictionary *)configs resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    if (!_apiKey) {
        reject(@"api_missing", @"Set a valid api key to start!", nil);
        return;
    }
    
    if (![_state  isEqual: StateNone]) {
        reject(@"too_many_request", @"An other process still running!", nil);
        return;
    }
    
    if (formData[@"audioFile"] != nil) {
        _filePath = formData[@"audioFile"];
    }
    
    if (_filePath != nil) {
        resolve(@{});
        [self makeRequest];
        return;
    }
    @try {
        _params = params;
        _formData = formData;
        _configs = configs;
        _state = StateRecording;
        
        NSString *fileName = [NSString stringWithFormat:@"%f%@",[[NSDate date] timeIntervalSince1970] * 1000, @".wav"];
        NSString *docDir = [NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES) firstObject];
        _filePath = [NSString stringWithFormat:@"%@/%@", docDir, fileName];
        // most audio players set session category to "Playback", record won't work in this mode
        // therefore set session category to "Record" before recording
        [[AVAudioSession sharedInstance] setCategory:AVAudioSessionCategoryRecord error:nil];
        
        _recordState.mIsRunning = true;
        _recordState.mCurrentPacket = 0;
        
        CFURLRef url = CFURLCreateWithString(kCFAllocatorDefault, (CFStringRef)_filePath, NULL);
        AudioFileCreateWithURL(url, kAudioFileWAVEType, &_recordState.mDataFormat, kAudioFileFlags_EraseFile, &_recordState.mAudioFile);
        CFRelease(url);
        
        AudioQueueNewInput(&_recordState.mDataFormat, HandleInputBuffer, &_recordState, NULL, NULL, 0, &_recordState.mQueue);
        for (int i = 0; i < kNumberBuffers; i++) {
            AudioQueueAllocateBuffer(_recordState.mQueue, _recordState.bufferByteSize, &_recordState.mBuffers[i]);
            AudioQueueEnqueueBuffer(_recordState.mQueue, _recordState.mBuffers[i], 0, NULL);
        }
        AudioQueueStart(_recordState.mQueue, NULL);
        
        resolve(@{});
        [self sendEventWithName:@"onModuleStateChange" body:@{@"state": _state}];
        
        if (configs[@"audioLengthInSeconds"] != nil) {
            NSInteger timeIntervalInSeconds = [RCTConvert NSInteger:configs[@"audioLengthInSeconds"]];
            [self startTimer:timeIntervalInSeconds];
        }
    }
    @catch (NSException * e) {
        reject(@"-1", e.reason, nil);
        [self handleModuleExeption:e];
    }
}

RCT_EXPORT_METHOD(stop:(RCTPromiseResolveBlock)resolve rejecter:(__unused RCTPromiseRejectBlock)reject) {
    @try {
        [self stopRecording];
        
        resolve(@{});
        if (_filePath != nil) {
            [self makeRequest];
        } else {
            _state = StateNone;
            [self sendEventWithName:@"onModuleStateChange" body:@{@"state": _state}];
        }
    }
    @catch (NSException * e) {
        reject(@"-1", e.reason, nil);
        [self handleModuleExeption:e];
    }
}

RCT_EXPORT_METHOD(cancel:(RCTPromiseResolveBlock)resolve rejecter:(__unused RCTPromiseRejectBlock)reject) {
    [self stopRecording];
    [self releaseResouce];
    
    _state = StateNone;
    resolve(@{});
    [self sendEventWithName:@"onModuleStateChange" body:@{@"state": _state}];
}

-(void) startTimer:(NSInteger)timeIntervalInSeconds {
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(timeIntervalInSeconds * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
        if ([self->_state  isEqual: StateRecording]) {
            [self stopRecording];
            [self releaseResouce];
            
            self->_state = StateNone;
            [self sendEventWithName:@"onModuleStateChange" body:@{@"state": self->_state}];
        }
    });
}

-(void) releaseResouce {
    NSLog(@"release resouce");
    if (![_filePath isEqual:nil]) {
        [[NSFileManager defaultManager] removeItemAtPath:_filePath error:nil];
        _filePath = nil;
    }
}

- (void) stopRecording {
    if (_recordState.mIsRunning) {
        _recordState.mIsRunning = false;
        AudioQueueStop(_recordState.mQueue, true);
        AudioQueueDispose(_recordState.mQueue, true);
        AudioFileClose(_recordState.mAudioFile);
    }
}

- (void) makeRequest {
    if ([_filePath isEqual: nil]) {
        [self handleModuleExeption:[NSException exceptionWithName:@"file_empty" reason:@"There no audio file to score!" userInfo:nil]];
        return;
    }
    
    _state = StateRecognizing;
    [self sendEventWithName:@"onModuleStateChange" body:@{@"state": _state}];
    @try {
        NSURLComponents *urlBuilder = [[NSURLComponents alloc] init];
        urlBuilder.scheme = @"https";
        urlBuilder.host = @"api2.speechace.com";
        
        NSString *apiPaths = [NSString stringWithFormat:@"/api/%@/%@/%@/json", [_configs valueForKey:@"callForAction"], [_configs valueForKey:@"actionForDatatype"], [[_params valueForKey:@"dialect"] isEqual: @"en-gb"] ? @"v0.1" : @"v0.5"];
        urlBuilder.path = apiPaths;

        NSArray<NSURLQueryItem *> *queryItems = @[[NSURLQueryItem queryItemWithName:@"key" value:_apiKey]];
        // add url get params
        if (_params.count > 0) {
            for(id key in _params) {
                id value = [_params objectForKey:key];
                queryItems = [queryItems arrayByAddingObject:[NSURLQueryItem queryItemWithName:key value:value]];
            }
        }
        urlBuilder.queryItems = queryItems;
        NSURL *url = urlBuilder.URL;
        NSLog(@"%@", url);
        
        NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url cachePolicy:NSURLRequestUseProtocolCachePolicy timeoutInterval:10.0];
        
        [request setCachePolicy:NSURLRequestReloadIgnoringLocalCacheData];
        [request setHTTPShouldHandleCookies:NO];
        [request setTimeoutInterval:60];
        [request setHTTPMethod:@"POST"];
        
        NSString *boundary = @"react-native-speechace";
        
        // set Content-Type in HTTP header
        NSString *contentType = [NSString stringWithFormat:@"multipart/form-data; boundary=%@", boundary];
        [request setValue:contentType forHTTPHeaderField: @"Content-Type"];
        
        // post body
        NSMutableData *body = [NSMutableData data];
        
        // add form data (all params are strings)
        if (_formData.count > 0) {
            for(id key in _formData) {
                if (![key  isEqual: @"user_audio_file"]) {
                    id value = [_formData objectForKey:key];
                    [body appendData:[[NSString stringWithFormat:@"--%@\r\n", boundary] dataUsingEncoding:NSUTF8StringEncoding]];
                    [body appendData:[[NSString stringWithFormat:@"Content-Disposition: form-data; name=%@\r\n\r\n", key] dataUsingEncoding:NSUTF8StringEncoding]];
                    [body appendData:[[NSString stringWithFormat:@"%@\r\n", value] dataUsingEncoding:NSUTF8StringEncoding]];
                }
            }
        }
        
        [body appendData:[[NSString stringWithFormat:@"\r\n--%@\r\n",boundary] dataUsingEncoding:NSUTF8StringEncoding]];
        [body appendData:[[NSString stringWithString:[NSString stringWithFormat:@"Content-Disposition: form-data; name=\"user_audio_file\"; filename=%@\r\n", [_filePath stringByDeletingPathExtension]]] dataUsingEncoding:NSUTF8StringEncoding]];
        [body appendData:[@"Content-Type: application/octet-stream\r\n\r\n" dataUsingEncoding:NSUTF8StringEncoding]];
        NSData *fileData = [[NSData alloc] initWithContentsOfURL:[NSURL fileURLWithPath:_filePath]];
        [body appendData:[NSData dataWithData:fileData]];
        [body appendData:[[NSString stringWithFormat:@"\r\n--%@--\r\n",boundary] dataUsingEncoding:NSUTF8StringEncoding]];
        
        [request setHTTPBody:body];
        
        [[[NSURLSession sharedSession] dataTaskWithRequest:request completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
            if (error) {
                NSLog(@"%@", error);
                [self handleModuleExeption:[NSException exceptionWithName:@"request_error" reason:[error localizedDescription] userInfo:nil]];
                return;
            } else {
                NSError * jsonError = nil;
                NSDictionary *dictionary = [NSJSONSerialization  JSONObjectWithData:data options:kNilOptions error:&jsonError];
                NSDictionary *response = @{@"response": [self dictionaryWithCamelCaseKeys: dictionary], @"filePath": self->_filePath};
                [self sendEventWithName:@"onSpeechRecognized" body:response];
            }
            
            self->_state = StateNone;
            [self sendEventWithName:@"onModuleStateChange" body:@{@"state": StateNone}];
            self->_filePath = nil;
        }] resume];
    } @catch (NSException * e) {
        [self handleModuleExeption:e];
    }
}

void HandleInputBuffer(void *inUserData,
                       AudioQueueRef inAQ,
                       AudioQueueBufferRef inBuffer,
                       const AudioTimeStamp *inStartTime,
                       UInt32 inNumPackets,
                       const AudioStreamPacketDescription *inPacketDesc) {
    AQRecordState* pRecordState = (AQRecordState *)inUserData;
    
    if (!pRecordState->mIsRunning) {
        return;
    }
    
    if (AudioFileWritePackets(pRecordState->mAudioFile, false, inBuffer->mAudioDataByteSize, inPacketDesc, pRecordState->mCurrentPacket, &inNumPackets, inBuffer->mAudioData) == noErr) {
        pRecordState->mCurrentPacket += inNumPackets;
    }
    
    short *samples = (short *) inBuffer->mAudioData;
    long nsamples = inBuffer->mAudioDataByteSize;
    //    NSData *data = [NSData dataWithBytes:samples length:nsamples];
    
    [pRecordState->mSelf sendEventWithName:@"onVoice" body:@{@"size": [NSNumber numberWithShort:*samples], @"length": [NSNumber numberWithLong:(long) nsamples]}];
    
    AudioQueueEnqueueBuffer(pRecordState->mQueue, inBuffer, 0, NULL);
}

- (NSArray<NSString *> *)supportedEvents
{
    return @[
        @"onVoiceStart",
        @"onVoice",
        @"onVoiceEnd",
        @"onError",
        @"onSpeechRecognized",
        @"onModuleStateChange"
    ];
}

- (void) handleModuleExeption:(NSException *)e {
    NSLog(@"Exception: %@", e);
    [self stopRecording];
    [self releaseResouce];
    _state = StateNone;
    [self sendJSEvent:@{@"-1": e.reason} :nil :nil :nil :nil];
    [self sendEventWithName:@"onModuleStateChange" body:@{@"state": _state}];
}

- (void) sendJSEvent:(NSDictionary*)error :(NSString*)startState :(NSArray*)transcriptions :(NSNumber*)isFinal :(NSDictionary*)speechResponse {
    if (error != nil) {
        [self sendEventWithName:@"onError" body:@{@"error": error}];
    }
    
    if (startState != nil) {
        [self sendEventWithName:@"onVoiceStart" body:startState];
    }
    
    if (transcriptions != nil) {
        [self sendEventWithName:@"onVoiceEnd" body:nil];
    }
    
    if (isFinal != nil) {
        [self sendEventWithName:@"onVoice" body: @{@"isFinal": isFinal}];
    }
    
    if (speechResponse != nil) {
        [self sendEventWithName:@"onSpeechRecognized" body:speechResponse];
    }
}


/*
 Recursive algorithm to find all nested dictionary keys and create an NSMutableDictionary copy with all keys converted to lowercase
 Returns an NSMutableDictionary with all keys and nested keys converted to lowercase.
 */
- (NSMutableDictionary *)dictionaryWithCamelCaseKeys:(NSDictionary *)dictionary
{
    NSMutableDictionary *resultDict = [NSMutableDictionary dictionaryWithCapacity:[dictionary count]];
    [dictionary enumerateKeysAndObjectsUsingBlock:^(NSString *key, id obj, BOOL *stop) {
        // There are 3 types of objects to consider, NSDictionary, NSArray and everything else
        id resultObj;
        if ([obj isKindOfClass:NSDictionary.class])
        {
            // Recursively dig deeper into this nested dictionary
            resultObj = [self dictionaryWithCamelCaseKeys:obj];
        }
        else if ([obj isKindOfClass:NSArray.class])
        {
            /*
             Iterate over this nested NSArray. Recursively convert any NSDictionary objects to the lowercase version.
             If the array contains another array then continue to recursively dig deeper.
             */
            resultObj = [NSMutableArray arrayWithCapacity:[obj count]];
            for (id arrayObj in obj)
            {
                if ([arrayObj isKindOfClass:NSDictionary.class])
                    [resultObj addObject:[self dictionaryWithCamelCaseKeys:arrayObj]];
                else if ([arrayObj isKindOfClass:NSArray.class])
                    [resultObj addObject:[self arrayWithCamelcaseKeysForDictionaryArray:arrayObj]];
                else
                    [resultObj addObject:arrayObj];
            }
        }
        else
        {
            // The object is not an NSDictionary or NSArray so keep the object as is
            resultObj = obj;
        }
        
        // The result object has been converted and can be added to the dictionary. Note this object may be nested inside a larger dictionary.
        [resultDict setObject:resultObj forKey:[self toCamelCase:key]];
    }];
    return resultDict;
}

/*
 Convert NSDictionary keys to lower case when embedded in an NSArray
 */
- (NSMutableArray *)arrayWithCamelcaseKeysForDictionaryArray:(NSArray *)dictionaryArray
{
    NSMutableArray *resultArray = [NSMutableArray arrayWithCapacity:[dictionaryArray count]];
    for (id eachObj in dictionaryArray)
    {
        if ([eachObj isKindOfClass:NSDictionary.class])
            [resultArray addObject:[self dictionaryWithCamelCaseKeys:eachObj]];
        else if ([eachObj isKindOfClass:NSArray.class])
            [resultArray addObject:[self arrayWithCamelcaseKeysForDictionaryArray:eachObj]];
    }
    return resultArray;
}


- (NSString *)toCamelCase:(NSString *)string
{
    NSString* letterCases =  [[[string capitalizedString] componentsSeparatedByCharactersInSet:[[NSCharacterSet characterSetWithCharactersInString:@"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"] invertedSet]] componentsJoinedByString:@""];
    return [NSString stringWithFormat:@"%@%@",[[letterCases substringToIndex:1] lowercaseString],[letterCases substringFromIndex:1]];
}

- (void)dealloc {
    AudioQueueDispose(_recordState.mQueue, true);
}

@end
