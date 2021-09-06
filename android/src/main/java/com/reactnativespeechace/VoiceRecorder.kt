package com.reactnativespeechace

import android.media.AudioRecord
import android.media.MediaRecorder
import android.media.audiofx.NoiseSuppressor
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * The WaveRecorder class used to record Waveform audio file using AudioRecord class to get the audio stream in PCM encoding
 * and then convert it to WAVE file (WAV due to its filename extension) by adding appropriate headers. This class uses
 * Kotlin Coroutine with IO dispatcher to writing input data on storage asynchronously.
 * @property filePath the path of the file to be saved.
 */
class VoiceRecorder(private var filePath: String, private var waveConfig: WaveConfig, private val mCallback: Callback) {

  abstract class Callback {
    /**
     * Called when the recorder starts hearing voice.
     */
    open fun onVoiceStart() {}

    /**
     * Called when the recorder is hearing voice.
     *
     * @param length The audio recording time in seconds
     * @param size The size of the actual data in `data`.
     */
    open fun onVoice(size: Int, length: Long) {}

    /**
     * Called when the recorder stops hearing voice.
     */
    open fun onVoiceEnd() {}
  }

  /**
   * Activates Noise Suppressor during recording if the device implements noise
   * suppression.
   */
  var noiseSuppressorActive: Boolean = true

  /**
   * The ID of the audio session this WaveRecorder belongs to.
   * The default value is -1 which means no audio session exist.
   */
  private var audioSessionId: Int = -1

  private var isRecording = false
  private var isPaused = false
  private lateinit var audioRecorder: AudioRecord
  private var noiseSuppressor: NoiseSuppressor? = null

  /**
   * Starts audio recording asynchronously and writes recorded data chunks on storage.
   */
  fun startRecording() {

    if (!isAudioRecorderInitialized()) {
      audioRecorder = AudioRecord(
        MediaRecorder.AudioSource.MIC,
        waveConfig.sampleRate,
        waveConfig.channels,
        waveConfig.audioEncoding,
        AudioRecord.getMinBufferSize(
          waveConfig.sampleRate,
          waveConfig.channels,
          waveConfig.audioEncoding
        )
      )

      audioSessionId = audioRecorder.audioSessionId

      isRecording = true

      audioRecorder.startRecording()

      if (noiseSuppressorActive) {
        noiseSuppressor = NoiseSuppressor.create(audioRecorder.audioSessionId)
      }

      mCallback.onVoiceStart()

      GlobalScope.launch(Dispatchers.IO) {
        writeAudioDataToStorage()
      }
    }
  }


  /**
   * Retrieves the sample rate currently used to record audio.
   *
   * @return The sample rate of recorded audio.
   */
  val sampleRate: Int get() = audioRecorder.sampleRate

  /**
   * Retrieves the state of recorder
   *
   * @return The state of recorder
   */
  val state: Int get() = audioRecorder.state

  private suspend fun writeAudioDataToStorage() {
    val bufferSize = AudioRecord.getMinBufferSize(
      waveConfig.sampleRate,
      waveConfig.channels,
      waveConfig.audioEncoding
    )
    val data = ByteArray(bufferSize)
    val file = File(filePath)
    val outputStream = file.outputStream()
    while (isRecording) {
      val operationStatus = audioRecorder.read(data, 0, bufferSize)

      if (AudioRecord.ERROR_INVALID_OPERATION != operationStatus) {
        if (!isPaused) outputStream.write(data)

        withContext(Dispatchers.Main) {
          val audioLengthInSeconds: Long = file.length() / (2 * waveConfig.sampleRate)
          mCallback.onVoice(calculateAmplitudeMax(data), audioLengthInSeconds)
        }
      }
    }

    outputStream.close()
    noiseSuppressor?.release()
  }

  private fun calculateAmplitudeMax(data: ByteArray): Int {
    val shortData = ShortArray(data.size / 2)
    ByteBuffer.wrap(data).order(ByteOrder.LITTLE_ENDIAN).asShortBuffer()
      .get(shortData)
    return shortData.maxOrNull()?.toInt() ?: 0
  }

  /** Changes @property filePath to @param newFilePath
   * Calling this method while still recording throws an IllegalStateException
   */
  fun changeFilePath(newFilePath: String) {
    if (isRecording)
      throw IllegalStateException("Cannot change filePath when still recording.")
    else
      filePath = newFilePath
  }

  /**
   * Stops audio recorder and release resources then writes recorded file headers.
   */
  fun stopRecording() {
    if (isAudioRecorderInitialized()) {
      isRecording = false
      isPaused = false
      audioRecorder.stop()
      audioRecorder.release()
      audioSessionId = -1
      WaveHeaderWriter(filePath, waveConfig).writeHeader()
      mCallback.onVoiceEnd()
    }
  }

  private fun isAudioRecorderInitialized(): Boolean =
    this::audioRecorder.isInitialized && audioRecorder.state == AudioRecord.STATE_INITIALIZED

}
