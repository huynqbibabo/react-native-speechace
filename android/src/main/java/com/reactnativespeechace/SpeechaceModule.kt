package com.reactnativespeechace

import android.content.res.AssetFileDescriptor
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.os.CountDownTimer
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
import kotlin.math.roundToInt


/**
 * The WaveRecorder class used to record Waveform audio file using AudioRecord class to get the audio stream in PCM encoding
 * and then convert it to WAVE file (WAV due to its filename extension) by adding appropriate headers. This class uses
 * Kotlin Coroutine with IO dispatcher to writing input data on storage asynchronously.
 */
class SpeechaceModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

  /**
   * Configuration for recording audio file.
   */
  private var waveConfig: WaveConfig = WaveConfig()
  private var mRecordTimer: CountDownTimer? = null
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
    var onModuleStateChange = "onModuleStateChange"
    var onPlayerStateChange = "onPlayerStateChange"
  }

  private var state = moduleStates.none
  private var queryParams: MutableMap<String, Any>? = null
  private var formData: MutableMap<String, Any>? = null
  private var configs: MutableMap<String, Any>? = null
  private var players: MutableMap<Double, MediaPlayer> = HashMap()
  private var _channel: Double? = null

  override fun getName(): String {
    return TAG
  }

  @ReactMethod
  fun setApiKey(key: String) {
    apiKey = key
  }

  @ReactMethod
  fun getState(promise: Promise) {
    promise.resolve(state)
  }

  @ReactMethod
  fun start(channel: Double, params: ReadableMap, formParams: ReadableMap?, callOptions: ReadableMap?, promise: Promise) {
    if (apiKey.isNullOrEmpty()) promise.reject("api_missing", "Set a valid api key to start!")
    if (state != moduleStates.none) {
      stopVoiceRecorder()
      releaseResources()
    }
    _channel = channel
    queryParams = params.toHashMap()
    if (formParams != null) {
      if (formParams.getString("user_audio_file") != null) {
        workingFile = formParams.getString("user_audio_file")
      }
      formData = formParams.toHashMap()
      (formData as HashMap<String, Any>).remove("user_audio_file")
    }
    configs = callOptions?.toHashMap()
    try {
      mClient = null
      mRequest = null
      if (!workingFile.isNullOrEmpty() && File(workingFile!!).exists()) {
        promise.resolve(null)
        makeRequest()
      } else {
        workingFile = buildFile()
        startVoiceRecorder(workingFile!!)
        promise.resolve(null)
        emitStateChangeEvent()
      }
    } catch (e: Exception) {
      promise.reject("-1", e.message)
      handleErrorEvent(e)
    }
  }

  @ReactMethod
  fun stop(channel: Double, promise: Promise) {
    synchronized(Any()) {
      _channel = channel
      stopVoiceRecorder()
      if (mRecordTimer != null) {
        mRecordTimer?.cancel()
        mRecordTimer = null
      }
      promise.resolve(null)
      if (workingFile != null) {
        makeRequest()
      } else {
        state = moduleStates.none
        emitStateChangeEvent()
      }
    }
  }

  @ReactMethod
  fun cancel(channel: Double, promise: Promise) {
    _channel = channel
    stopVoiceRecorder()
    releaseResources()
    promise.resolve(null)
    state = moduleStates.none
    emitStateChangeEvent()
  }

  @ReactMethod()
  fun clear(promise: Promise) {
    stopVoiceRecorder()
    for ((key) in players) {
      val player: MediaPlayer? = players[key]
      if (player != null) {
        player.reset()
        player.release()
      }
    }
    players = HashMap()
    val path = reactApplicationContext.externalCacheDir?.absolutePath + "/AudioCacheFiles/";
    val pathAsFile = File(path)

    if (pathAsFile.isDirectory) {
      pathAsFile.delete()
    }
    promise.resolve(true)
  }

  @ReactMethod
  fun prepare(filePath: String, key: Double, promise: Promise) {
    try {
      release(key)
      val player = createMediaPlayer(filePath)
      if (player == null) {
        promise.reject("player error", "Can't prepare player for path $filePath")
        return
      }
      player.setAudioAttributes(AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_MEDIA)
        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
        .build())
      players[key] = player
      player.prepare()

      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("-1", e.message, e)
    }
  }


  @ReactMethod
  fun play(key: Double, promise: Promise) {
    val player: MediaPlayer? = players[key]
    if (players.isNotEmpty() && player?.isPlaying == true) {
      promise.reject("player error", "Player")
      return
    }
    player?.setOnCompletionListener { mp ->
      if (!mp.isLooping) {
        val params = Arguments.createMap()
        params.putDouble("key", key)
        params.putDouble("isPlaying", 0.0)

        sendJSEvent(moduleEvents.onPlayerStateChange, params)
      }
    }
    player?.setOnErrorListener { _, _, _ ->
      val params = Arguments.createMap()
      params.putDouble("key", key)
      params.putDouble("isPlaying", 0.0)

      sendJSEvent(moduleEvents.onPlayerStateChange, params)
      true
    }
    player?.start()
    promise.resolve(true)
    val params = Arguments.createMap()
    params.putDouble("key", key)
    params.putDouble("isPlaying", 1.0)

    sendJSEvent(moduleEvents.onPlayerStateChange, params)
  }


  @ReactMethod
  fun pause(key: Double, promise: Promise) {
    val player: MediaPlayer? = players[key]
    if (player != null && player.isPlaying) {
      player.pause()
    }
    promise.resolve(true)
    val params = Arguments.createMap()
    params.putDouble("key", key)
    params.putDouble("isPlaying", 0.0)
    sendJSEvent(moduleEvents.onPlayerStateChange, params)
  }

  @ReactMethod
  fun stopPlayer(key: Double, promise: Promise) {
    val player: MediaPlayer? = players[key]
    if (player != null && player.isPlaying) {
      player.pause()
      player.seekTo(0)
    }
    promise.resolve(true)
    val params = Arguments.createMap()
    params.putDouble("key", key)
    params.putDouble("isPlaying", 0.0)
    sendJSEvent(moduleEvents.onPlayerStateChange, params)
  }


  @ReactMethod
  fun release(key: Double) {
    val player: MediaPlayer? = players[key]
    if (player != null) {
      player.reset()
      player.release()
      players.remove(key)
    }
  }


  @ReactMethod
  fun setVolume(key: Double, left: Double, right: Double) {
    players[key]?.setVolume(left.toFloat(), right.toFloat())
  }


  @ReactMethod
  fun seek(key: Double, sec: Double) {
    players[key]?.seekTo((sec * 1000).roundToInt())
  }

  private fun createMediaPlayer(filePath: String): MediaPlayer? {
    val mediaPlayer = MediaPlayer()
    if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
      try {
        mediaPlayer.setDataSource(filePath)
      } catch (e: Exception) {
        Log.e("RNSoundModule", "Exception", e)
        return null
      }
      return mediaPlayer
    }

    if (filePath.startsWith("asset:/")) {
      try {
        val descriptor: AssetFileDescriptor = reactApplicationContext.assets.openFd(filePath.replace("asset:/", ""))
        mediaPlayer.setDataSource(descriptor.fileDescriptor, descriptor.startOffset, descriptor.length)
        descriptor.close()
      } catch (e: Exception) {
        Log.e("RNSoundModule", "Exception", e)
        return null
      }

      return mediaPlayer
    }

    try {
      mediaPlayer.setDataSource(filePath)
    } catch (e: Exception) {
      Log.e("RNSoundModule", "Exception", e)
      return null
    }
    return mediaPlayer
  }

  private fun makeRequest() {
    if (workingFile == null) {
      handleErrorEvent(Exception("There no audio file to score!"))
      return
    }
    state = moduleStates.recognizing
    emitStateChangeEvent()
    try {
      if (mClient == null) mClient = OkHttpClient().newBuilder()
        .build()
      val file = File(workingFile!!)
      val formDataBuilder = MultipartBody.Builder().setType(MultipartBody.FORM)

      // add form data to request
      if (formData != null) {
        for ((key, value) in formData!!) {
          formDataBuilder.addFormDataPart(key, value.toString())
        }
      }
      formDataBuilder.addFormDataPart("user_audio_file", file.name,
        file.asRequestBody("application/octet-stream".toMediaTypeOrNull())
      )
      val body = formDataBuilder.build()
      if (mClient != null) {
        cancelCallWithTag(mClient!!)
      }

      val urlBuilder = HttpUrl.Builder()
      urlBuilder.scheme("https")
        .host("api2.speechace.com")
        .addQueryParameter("key", apiKey)
      // add url get params
      if (queryParams != null) {
        for ((key, value) in queryParams!!) {
          urlBuilder.addQueryParameter(key, value.toString())
        }
      }
      val apiVers = if (queryParams?.getValue("dialect")?.equals("en-bg") == true) "v0.1" else "v0.5"
      val apiPaths = "api/${configs?.getValue("callForAction")}/${configs?.getValue("actionForDatatype")}/${apiVers}/json"
      urlBuilder.addPathSegments(apiPaths)
      val url = urlBuilder.build()
      Log.i(TAG, "makeRequest: $url")

      mRequest = Request.Builder()
        .url(url)
        .tag(TAG)
        .method("POST", body)
        .build()
      val response: Response = mClient!!.newCall(mRequest!!).execute()
      val jsonString: String? = response.body?.string()
      val jObject = JSONObject(jsonString!!)

      val params = Arguments.createMap()
      params.putString("filePath", workingFile)
      params.putMap("response", convertJsonToMap(jObject))
      params.putDouble("channel", _channel!!)
      sendJSEvent(moduleEvents.onSpeechRecognized, params)

      state = moduleStates.none
      emitStateChangeEvent()
      response.body?.close()
      mRequest = null
      mClient = null
      workingFile = null
      _channel = null
    } catch (e: Exception) {
      handleErrorEvent(e)
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
    state = moduleStates.recording
    if (mVoiceRecorder != null) {
      mVoiceRecorder!!.stopRecording()
    }
    mVoiceRecorder = VoiceRecorder(file, waveConfig, mVoiceCallback)
    mVoiceRecorder!!.startRecording()
    if (configs?.containsKey("audioLengthInSeconds") == true && configs?.getValue("audioLengthInSeconds") != null) {
      val audioLengthInSeconds = configs?.getValue("audioLengthInSeconds").toString().toDouble().toInt()
      if (mRecordTimer != null) {
        mRecordTimer?.cancel()
        mRecordTimer = null
      }
      mRecordTimer = object : CountDownTimer((audioLengthInSeconds * 1000).toLong(), 1000) {
        override fun onTick(millisUntilFinished: Long) {
          // skip
        }

        override fun onFinish() {
          if (state == moduleStates.recording) {
            stopVoiceRecorder()
            releaseResources()
          }
          if (mRecordTimer != null) {
            mRecordTimer?.cancel()
            mRecordTimer = null
          }
          state = moduleStates.none
          emitStateChangeEvent()
        }
      }.start()
    }
  }

  private fun stopVoiceRecorder() {
    if (mVoiceRecorder != null) {
      mVoiceRecorder?.stopRecording()
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
      params.putInt("size", size)
      params.putDouble("length", length.toDouble())
      sendJSEvent(moduleEvents.onVoice, params)
    }

    override fun onVoiceEnd() {
      sendJSEvent(moduleEvents.onVoiceEnd, Arguments.createMap())
    }
  }

  private fun buildFile(): String {
    val path = reactApplicationContext.externalCacheDir?.absolutePath + "/AudioCacheFiles/"
    val pathAsFile = File(path)

    if (!pathAsFile.isDirectory) {
      pathAsFile.mkdir()
    }
    val fileId = System.currentTimeMillis().toString()
    val filePath = "$path/$fileId.wav"
    mTempFiles[fileId] = filePath
    return filePath
  }

  private fun deleteTempFile(tmpPath: String) {
    val file = File(tmpPath)
    file.delete()
  }

  private fun releaseResources() {
    stopVoiceRecorder()
    if (mClient != null) {
      cancelCallWithTag(mClient!!)
      mRequest = null
      mClient = null
    }
    workingFile?.let { deleteTempFile(it) }
    workingFile = null
    state = moduleStates.none
    if (mRecordTimer !== null) {
      mRecordTimer?.cancel()
      mRecordTimer = null
    }
  }

  private fun handleErrorEvent(throwable: Throwable) {
    throwable.printStackTrace()
    stopVoiceRecorder()
    releaseResources()

    sendJSErrorEvent(throwable.message)

    state = moduleStates.none
    emitStateChangeEvent()
  }

  private fun emitStateChangeEvent() {
    val params = Arguments.createMap()
    params.putString("state", state)
    params.putDouble("channel", _channel!!)
    sendJSEvent(moduleEvents.onModuleStateChange, params)
  }

  private fun sendJSErrorEvent(message: String?) {
    val params = Arguments.createMap()
    params.putString("message", message)
    params.putDouble("channel", _channel!!)
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
