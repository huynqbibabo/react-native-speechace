package com.reactnativespeechace

import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import okhttp3.*
import org.json.JSONObject
import java.io.File


/**
 * The WaveRecorder class used to record Waveform audio file using AudioRecord class to get the audio stream in PCM encoding
 * and then convert it to WAVE file (WAV due to its filename extension) by adding appropriate headers. This class uses
 * Kotlin Coroutine with IO dispatcher to writing input data on storage asynchronously.
 */
class SpeechaceModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

  private var mRequest: Request? = null
  private var mClient: OkHttpClient? = null
  private var apiKey: String? = null
  private var mVoiceRecorder: VoiceRecorder? = null
  private var mTempFiles: MutableMap<String, String> = HashMap()

  private var workingFile: String? = null

  private val moduleStates = object {
    var none: String = "NONE"
    var recording: String = "RECORDING"
    var recognizing: String = "RECOGNIZING"
  }

  private val moduleEvents = object {
    var onVoiceStart: String = "onVoiceStart"
    var onVoice: String = "onVoice"
    var onVoiceEnd: String = "onVoiceEnd"
    var onError: String = "onError"
    var onSpeechRecognized = "onSpeechRecognized"
  }

  private var state = moduleStates.none
  private var queryParams: MutableMap<String, Any>? = null
  private var formData: MutableMap<String, Any>? = null

  override fun getName(): String {
    return TAG
  }

  @ReactMethod
  fun setApiKey(key: String) {
    Log.d(TAG, "setApiKey: $key")
    apiKey = key
  }

  @ReactMethod
  fun getState(promise: Promise) {
    promise.resolve(state)
  }

  @ReactMethod
  fun start(params: ReadableMap?, options: ReadableMap?, promise: Promise) {
    if (apiKey.isNullOrEmpty()) promise.reject("api_missing", "Set a valid api key to start!")
    if (state != moduleStates.none) {
      promise.reject("-2", "Process already running!")
      return
    }
    if (params != null) {
      queryParams = params.toHashMap();
    }
    if (options != null) {
      if (!options.isNull("audioFile")) {
        workingFile = options.getString("audioFile")
      }
      formData = options.toHashMap()
      (formData as HashMap<String, Any>).remove("audioFile")
    }
    try {
      mClient = null
      mRequest = null
      if (!workingFile.isNullOrEmpty() && File(workingFile).exists()) {
        state = moduleStates.recognizing
        promise.resolve(state)
        makeRequest()
      } else {
        workingFile = buildFile()
        Log.i(TAG, "start recording to file: $workingFile")
        state = moduleStates.recording
        startVoiceRecorder(workingFile!!)
        promise.resolve(state)
      }
    } catch (e: Exception) {
      state = moduleStates.none
      workingFile = null
      e.printStackTrace()
      promise.reject("-1", e.message)
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    synchronized(Any()) {
      stopVoiceRecorder()
      state = moduleStates.recognizing
      makeRequest()
      promise.resolve(state)
    }
  }

  @ReactMethod
  fun cancel(promise: Promise) {
    stopVoiceRecorder()
    if (mClient != null) {
      cancelCallWithTag(mClient!!, TAG)
      mRequest = null
      mClient = null
    }
    workingFile?.let { deleteTempFile(it) }
    workingFile = null
    state = moduleStates.none
    promise.resolve(state)
  }

  private fun makeRequest() {
    try {
      mClient = OkHttpClient().newBuilder()
        .build()
      val file = File(workingFile)
      val body: RequestBody = MultipartBody.Builder().setType(MultipartBody.FORM)
        .addFormDataPart("text", "apple")
        .addFormDataPart("user_audio_file", file.name,
          RequestBody.create(MediaType.parse("application/octet-stream"), file))
        .build()
      if (mClient != null) {
        cancelCallWithTag(mClient!!, TAG)
      }
      mRequest = Request.Builder()
        .url("https://api2.speechace.com/api/scoring/text/v0.5/json?key=$apiKey&dialect=en-us&user_id=XYZ-ABC-99001")
        .tag(TAG)
        .method("POST", body)
        .build()
      val response: Response = mClient!!.newCall(mRequest).execute()
      val jsonString: String? = response.body()?.string()
      Log.i(TAG, "stop: $response")
      val jObject = JSONObject(jsonString)
      Log.i(TAG, "jobject: $jObject")

      val params = Arguments.createMap()
      params.putString("response", jsonString)
      sendJSEvent(moduleEvents.onSpeechRecognized, params)
    } catch (e: Exception) {
      e.printStackTrace()
      handleErrorEvent(e)
    }
  }

  private fun cancelCallWithTag(client: OkHttpClient, tag: String?) {
    for (call in client.dispatcher().queuedCalls()) {
      if (call.request().tag()!! == tag) call.cancel()
    }
    for (call in client.dispatcher().runningCalls()) {
      if (call.request().tag()!! == tag) call.cancel()
    }
  }

  private fun startVoiceRecorder(file: String) {
    if (mVoiceRecorder != null) {
      mVoiceRecorder!!.stopRecording()
    }
    mVoiceRecorder = VoiceRecorder(file, mVoiceCallback)
    mVoiceRecorder!!.startRecording()
  }

  private fun stopVoiceRecorder() {
    if (mVoiceRecorder != null) {
      mVoiceRecorder!!.stopRecording()
      mVoiceRecorder = null
    }

  }

  private val mVoiceCallback: VoiceRecorder.Callback = object : VoiceRecorder.Callback() {
    override fun onVoiceStart() {
      val params = Arguments.createMap()
      params.putInt("sampleRate", mVoiceRecorder!!.sampleRate)
      params.putInt("voiceRecorderState", mVoiceRecorder!!.state)
      sendJSEvent(moduleEvents.onVoiceStart, params)
    }

    override fun onVoice(size: Int, length: Long) {
      val params = Arguments.createMap()
      Log.i(TAG, "onVoice: $size")
      Log.i(TAG, "onVoice: $length")
      params.putInt("size", size)
      params.putDouble("length", length.toDouble())
      sendJSEvent(moduleEvents.onVoice, params)
    }

    override fun onVoiceEnd() {
      sendJSEvent(moduleEvents.onVoiceEnd, Arguments.createMap())
    }
  }

  private fun buildFile(): String {
    val fileId = System.currentTimeMillis().toString()
    val filePath = reactApplicationContext.externalCacheDir?.absolutePath + "/$fileId.wav"
    mTempFiles[fileId] = filePath
    return filePath
  }

  private fun deleteTempFile(tmpPath: String) {
    val file = File(tmpPath)
    file.delete()
  }

  private fun handleErrorEvent(throwable: Throwable) {
    sendJSErrorEvent(throwable.message)
  }

  private fun sendJSErrorEvent(message: String?) {
    val params = Arguments.createMap()
    params.putString("message", message)
    sendJSEvent(moduleEvents.onError, params)
  }

  private fun sendJSEvent(
    eventName: String,
    params: WritableMap
  ) {
    reactApplicationContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(eventName, params)
  }

  companion object {
    private const val TAG = "Speechace"
  }
}
