#import "Speechace.h"

@implementation Speechace

RCT_EXPORT_MODULE()

- (instancetype)init
{
    self = [super init];
    RCTLogInfo(@"init");
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
    NSLog(@"set api key: %@", key);
    _apiKey = key;
}

RCT_EXPORT_METHOD(start:(NSDictionary *)params formData:(NSDictionary *)formData resolver:(RCTPromiseResolveBlock)resolve rejecter:(__unused RCTPromiseRejectBlock)reject) {
    if (!_apiKey) {
        reject(@"api_missing", @"Set a valid api key to start!", nil);
        return;
    }
    NSLog( @"%@", params);
    NSLog(@"%@", formData);
    
    if (formData[@"audioFile"]) {
        _filePath = formData[@"audioFile"];
    }
    
    if ([_filePath length] > 0) {
        _state = StateRecognizing;
        resolve(_state);
        [self makeRequest];
        return;
    }
    @try {
        _state = StateRecording;
        NSString *fileName = [NSString stringWithFormat:@"%f%@",[[NSDate date] timeIntervalSince1970] * 1000, @".wav"];
        NSString *docDir = [NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES) firstObject];
        _filePath = [NSString stringWithFormat:@"%@/%@", docDir, fileName];
        
        RCTLogInfo(@"start:%@", _filePath);
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
        resolve(_state);
    }
    @catch (NSException * e) {
        _state = StateNone;
        _filePath = nil;
        NSLog(@"Exception: %@", e);
        [self sendJSEvent:@{@"-1": e.reason} :nil :nil :nil];
    }
    
}

RCT_EXPORT_METHOD(stop:(RCTPromiseResolveBlock)resolve rejecter:(__unused RCTPromiseRejectBlock)reject) {
    RCTLogInfo(@"stop");
    if (_recordState.mIsRunning) {
        _recordState.mIsRunning = false;
        AudioQueueStop(_recordState.mQueue, true);
        AudioQueueDispose(_recordState.mQueue, true);
        AudioFileClose(_recordState.mAudioFile);
    }
    
    _state = StateRecognizing;
    resolve(_state);
    [self makeRequest];
    //    resolve(_filePath);
    //    unsigned long long fileSize = [[[NSFileMana
    
}

- (void) makeRequest {
    NSURLComponents *urlBuilder = [[NSURLComponents alloc] initWithString:@"api2.speechace.com"];
    [urlBuilder setScheme:@"https"];
    [urlBuilder setPath:@"api/scoring/text/v0.5/json"];
    
    if (_params.count > 0) {
        for(id key in _params) {
            id value = [_params objectForKey:key];
            [urlBuilder setQuery:[NSString stringWithFormat:@"%@=%@", key, value]];
        }
    }
    
    NSMutableURLRequest *request = [[NSMutableURLRequest alloc] initWithURL:urlBuilder.URL];
    
    NSString *fileContent = [[NSBundle mainBundle] pathForResource:_filePath ofType:@"wav"];
    NSData *fileData = [[NSData alloc] initWithContentsOfFile:fileContent];
    
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
    
    // add params (all params are strings)
    //    [body appendData:[[NSString stringWithFormat:@"--%@\r\n", boundary] dataUsingEncoding:NSUTF8StringEncoding]];
    //    [body appendData:[[NSString stringWithFormat:@"Content-Disposition: form-data; name=%@\r\n\r\n", @"imageCaption"] dataUsingEncoding:NSUTF8StringEncoding]];
    //    [body appendData:[[NSString stringWithFormat:@"%@\r\n", @"Some Caption"] dataUsingEncoding:NSUTF8StringEncoding]];
    
    
    [body appendData:[[NSString stringWithFormat:@"\r\n--%@\r\n",boundary] dataUsingEncoding:NSUTF8StringEncoding]];
    [body appendData:[[NSString stringWithString:[NSString stringWithFormat:@"Content-Disposition: form-data; name=\"user_audio_file\"; filename=\".wav\"\r\n"]] dataUsingEncoding:NSUTF8StringEncoding]];
    [body appendData:[@"Content-Type: application/octet-stream\r\n\r\n" dataUsingEncoding:NSUTF8StringEncoding]];
    [body appendData:[NSData dataWithData:fileData]];
    
    [body appendData:[[NSString stringWithFormat:@"\r\n--%@--\r\n",boundary] dataUsingEncoding:NSUTF8StringEncoding]];
    [request setHTTPBody:body];
    
    
    NSData *returnData = [NSURLConnection sendSynchronousRequest:request returningResponse:nil error:nil];
    NSString *returnString = [[NSString alloc] initWithData:returnData encoding:NSUTF8StringEncoding];
    
    NSLog(@"Return String= %@",returnString);
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
    NSData *data = [NSData dataWithBytes:samples length:nsamples];
    NSString *str = [data base64EncodedStringWithOptions:0];
    [pRecordState->mSelf sendEventWithName:@"onVoice" body:str];
    
    AudioQueueEnqueueBuffer(pRecordState->mQueue, inBuffer, 0, NULL);
}

- (NSArray<NSString *> *)supportedEvents
{
    return @[
        @"onVoiceStart",
        @"onVoice",
        @"onVoiceEnd",
        @"onError",
        @"onSpeechRecognized"
    ];
}

- (void) sendJSEvent:(NSDictionary*)error :(NSString*)bestTranscription :(NSArray*)transcriptions :(NSNumber*)isFinal {
    if (error != nil) {
        [self sendEventWithName:@"onError" body:@{@"error": error}];
    }
    if (bestTranscription != nil) {
        [self sendEventWithName:@"onVoiceStart" body:nil];
    }
    
    if (transcriptions != nil) {
        [self sendEventWithName:@"onVoiceEnd" body:nil];
    }
    
    if (isFinal != nil) {
        [self sendEventWithName:@"onVoice" body: @{@"isFinal": isFinal}];
    }
}

- (void)dealloc {
    RCTLogInfo(@"dealloc");
    AudioQueueDispose(_recordState.mQueue, true);
}

@end
