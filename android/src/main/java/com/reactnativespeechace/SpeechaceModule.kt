package com.reactnativespeechace

import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.common.base.CaseFormat
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.asRequestBody
import org.json.JSONArray
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
  fun start(params: ReadableMap, options: ReadableMap?, promise: Promise) {
    if (apiKey.isNullOrEmpty()) promise.reject("api_missing", "Set a valid api key to start!")
    if (state != moduleStates.none) {
      promise.reject("-2", "Process already running!")
      return
    }
    Log.i(TAG, "start: $options")
    queryParams = params.toHashMap()
    if (options != null) {
      if (options.getString("audioFile") != null) {
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
    if (state == moduleStates.none) {
      promise.resolve(state)
      return
    }
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
      cancelCallWithTag(mClient!!)
      mRequest = null
      mClient = null
    }
    workingFile?.let { deleteTempFile(it) }
    workingFile = null
    state = moduleStates.none
    promise.resolve(state)
  }

  private fun makeRequest() {
    if (workingFile == null) {
      sendJSErrorEvent("There no audio file to score!")
      return
    }
    try {
      if (mClient == null) mClient = OkHttpClient().newBuilder()
        .build()
      val file = File(workingFile)
      val formDataBuilder = MultipartBody.Builder().setType(MultipartBody.FORM);
      if (formData != null) {
        for ((key, value) in formData!!) {
          formDataBuilder.addFormDataPart(key, value.toString())
        }
      }
      formDataBuilder.addFormDataPart("user_audio_file", file.name,
        file.asRequestBody("application/octet-stream".toMediaTypeOrNull()))
      val body = formDataBuilder.build()
      if (mClient != null) {
        cancelCallWithTag(mClient!!)
      }

      val urlBuilder = HttpUrl.Builder()
      urlBuilder.scheme("https")
        .host("api2.speechace.com")
        .addPathSegments("api/scoring/text/v0.5/json")
        .addQueryParameter("key", apiKey)
      if (queryParams != null) {
        for ((key, value) in queryParams!!) {
          urlBuilder.addQueryParameter(key, value.toString())
        }
      }
      mRequest = Request.Builder()
        .url(urlBuilder.build())
        .tag(TAG)
        .method("POST", body)
        .build()
      val response: Response = mClient!!.newCall(mRequest!!).execute()
      val jsonString: String? = response.body?.string()
      val jObject = JSONObject(jsonString)

      val params = Arguments.createMap()
      params.putString("filePath", workingFile)
      params.putMap("response", convertJsonToMap(jObject))
      sendJSEvent(moduleEvents.onSpeechRecognized, params)

      state = moduleStates.none
      response.body?.close()
      mRequest = null
      mClient = null
      workingFile = null
    } catch (e: Exception) {
      e.printStackTrace()
      handleErrorEvent(e)

      state = moduleStates.none
      mRequest = null
      mClient = null
      workingFile = null
    }
  }

  private fun cancelCallWithTag(client: OkHttpClient) {
    for (call in client.dispatcher.queuedCalls()) {
      if (call.request().tag()!! == TAG) call.cancel()
    }
    for (call in client.dispatcher.runningCalls()) {
      if (call.request().tag()!! == TAG) call.cancel()
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

  private fun convertJsonToMap(jsonObject: JSONObject): WritableMap {
    try {
      val map: WritableMap = WritableNativeMap()
      val iterator = jsonObject.keys()
      while (iterator.hasNext()) {
        val key = iterator.next()
        when (val value = jsonObject[key]) {

          is JSONObject -> {
            map.putMap(CaseFormat.LOWER_UNDERSCORE.to(CaseFormat.LOWER_CAMEL, key), convertJsonToMap(value))
          }
          is JSONArray -> {
            map.putArray(CaseFormat.LOWER_UNDERSCORE.to(CaseFormat.LOWER_CAMEL, key), convertJsonToArray(value))
          }
          is Boolean -> {
            map.putBoolean(CaseFormat.LOWER_UNDERSCORE.to(CaseFormat.LOWER_CAMEL, key), value)
          }
          is Int -> {
            map.putInt(CaseFormat.LOWER_UNDERSCORE.to(CaseFormat.LOWER_CAMEL, key), value)
          }
          is Double -> {
            map.putDouble(CaseFormat.LOWER_UNDERSCORE.to(CaseFormat.LOWER_CAMEL, key), value)
          }
          is String -> {
            map.putString(CaseFormat.LOWER_UNDERSCORE.to(CaseFormat.LOWER_CAMEL, key), value)
          }
          else -> {
            map.putString(CaseFormat.LOWER_UNDERSCORE.to(CaseFormat.LOWER_CAMEL, key), value.toString())
          }
        }
      }
      return map
    } catch (e: Exception) {
      handleErrorEvent(e)
      e.printStackTrace()
      return Arguments.createMap()
    }
  }

  private fun convertJsonToArray(jsonArray: JSONArray): WritableArray? {
    try {
      val array: WritableArray = WritableNativeArray()
      for (i in 0 until jsonArray.length()) {
        when (val value = jsonArray[i]) {
            is JSONObject -> {
              array.pushMap(convertJsonToMap(value))
            }
          is JSONArray -> {
            array.pushArray(convertJsonToArray(value))
          }
          is Boolean -> {
            array.pushBoolean(value)
          }
          is Int -> {
            array.pushInt(value)
          }
          is Double -> {
            array.pushDouble(value)
          }
          is String -> {
            array.pushString(value)
          }
          else -> {
            array.pushString(value.toString())
          }
        }
      }
      return array
    } catch (e: Exception) {
      handleErrorEvent(e)
      e.printStackTrace()
      return null
    }
  }

  companion object {
    private const val TAG = "Speechace"
  }
}
