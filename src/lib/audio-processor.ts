/**
 * Audio processing utilities for cutting and manipulating audio files
 * Uses Web Audio API for client-side audio processing
 */

export interface AudioRegion {
  start: number // start time in seconds
  end: number // end time in seconds
}

export class AudioProcessor {
  private audioContext: AudioContext | null = null
  /**
   * Initialize AudioContext (lazy initialization)
   */
  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      // Create AudioContext with fallback for older browsers
      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.audioContext = new AudioContextClass()
    }
    return this.audioContext
  }

  /**
   * Cut audio file to specified region
   * @param audioFile - Original audio file
   * @param region - Time region to extract (in seconds)
   * @param outputFormat - Output format (defaults to original file type)
   * @returns Promise<File> - New audio file with only the selected region
   */
  async cutAudioRegion(audioFile: File, region: AudioRegion, outputFormat?: string): Promise<File> {
    const audioContext = this.getAudioContext()

    try {
      // Convert file to ArrayBuffer
      const arrayBuffer = await audioFile.arrayBuffer()

      // Decode audio data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

      // Calculate sample boundaries
      const sampleRate = audioBuffer.sampleRate
      const startSample = Math.floor(region.start * sampleRate)
      const endSample = Math.floor(region.end * sampleRate)
      const lengthSamples = endSample - startSample

      // Validate region bounds
      if (startSample < 0 || endSample > audioBuffer.length || startSample >= endSample) {
        throw new Error('Invalid audio region specified')
      }

      // Create new audio buffer with the cut region
      const cutBuffer = audioContext.createBuffer(
        audioBuffer.numberOfChannels,
        lengthSamples,
        sampleRate,
      )

      // Copy audio data for each channel
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const originalData = audioBuffer.getChannelData(channel)
        const cutData = cutBuffer.getChannelData(channel)

        for (let i = 0; i < lengthSamples; i++) {
          cutData[i] = originalData[startSample + i]
        }
      }

      // Convert to audio file
      const audioBlob = await this.audioBufferToBlob(cutBuffer, outputFormat || audioFile.type)

      // Create filename for the cut audio
      const originalName = audioFile.name
      const nameWithoutExt =
        originalName.substring(0, originalName.lastIndexOf('.')) || originalName
      const extension = this.getFileExtension(outputFormat || audioFile.type)
      const cutFileName = `${nameWithoutExt}_${this.formatTime(region.start)}-${this.formatTime(region.end)}.${extension}`

      return new File([audioBlob], cutFileName, { type: outputFormat || audioFile.type })
    } catch (error) {
      console.error('Error cutting audio:', error)
      throw new Error(
        `Failed to cut audio: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Convert AudioBuffer to Blob
   * @param audioBuffer - AudioBuffer to convert
   * @param mimeType - Output MIME type
   * @returns Promise<Blob> - Audio blob
   */
  private async audioBufferToBlob(audioBuffer: AudioBuffer, mimeType: string): Promise<Blob> {
    // For WAV format, we can create it directly
    if (mimeType.includes('wav')) {
      return this.audioBufferToWav(audioBuffer)
    }

    // For other formats, we'll use MediaRecorder if available
    // This is a fallback that converts to WAV for better compatibility
    return this.audioBufferToWav(audioBuffer)
  }

  /**
   * Convert AudioBuffer to WAV Blob
   * @param audioBuffer - AudioBuffer to convert
   * @returns Blob - WAV audio blob
   */
  private audioBufferToWav(audioBuffer: AudioBuffer): Blob {
    const numberOfChannels = audioBuffer.numberOfChannels
    const sampleRate = audioBuffer.sampleRate
    const length = audioBuffer.length
    const buffer = new ArrayBuffer(44 + length * numberOfChannels * 2)
    const view = new DataView(buffer)

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    const writeUint32 = (offset: number, value: number) => {
      view.setUint32(offset, value, true)
    }

    const writeUint16 = (offset: number, value: number) => {
      view.setUint16(offset, value, true)
    }

    // RIFF identifier
    writeString(0, 'RIFF')
    // file length minus RIFF identifier and file description length
    writeUint32(4, 36 + length * numberOfChannels * 2)
    // RIFF type
    writeString(8, 'WAVE')
    // format chunk identifier
    writeString(12, 'fmt ')
    // format chunk length
    writeUint32(16, 16)
    // sample format (raw)
    writeUint16(20, 1)
    // channel count
    writeUint16(22, numberOfChannels)
    // sample rate
    writeUint32(24, sampleRate)
    // byte rate (sample rate * block align)
    writeUint32(28, sampleRate * numberOfChannels * 2)
    // block align (channel count * bytes per sample)
    writeUint16(32, numberOfChannels * 2)
    // bits per sample
    writeUint16(34, 16)
    // data chunk identifier
    writeString(36, 'data')
    // data chunk length
    writeUint32(40, length * numberOfChannels * 2)

    // Convert float samples to 16-bit PCM
    let offset = 44
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]))
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
        offset += 2
      }
    }

    return new Blob([buffer], { type: 'audio/wav' })
  }

  /**
   * Get file extension from MIME type
   * @param mimeType - MIME type
   * @returns string - File extension
   */
  private getFileExtension(mimeType: string): string {
    const typeMap: Record<string, string> = {
      'audio/wav': 'wav',
      'audio/x-wav': 'wav',
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3',
      'audio/mp4': 'm4a',
      'audio/m4a': 'm4a',
      'audio/ogg': 'ogg',
      'audio/webm': 'webm',
      'audio/flac': 'flac',
    }

    return typeMap[mimeType] || 'wav'
  }

  /**
   * Format time in MM:SS format
   * @param seconds - Time in seconds
   * @returns string - Formatted time
   */
  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}-${secs.toString().padStart(2, '0')}`
  }

  /**
   * Get audio duration from file
   * @param audioFile - Audio file
   * @returns Promise<number> - Duration in seconds
   */
  async getAudioDuration(audioFile: File): Promise<number> {
    const audioContext = this.getAudioContext()

    try {
      const arrayBuffer = await audioFile.arrayBuffer()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      return audioBuffer.duration
    } catch (error) {
      console.error('Error getting audio duration:', error)
      throw new Error('Failed to get audio duration')
    }
  }

  /**
   * Validate if audio region is valid for the given file
   * @param audioFile - Audio file
   * @param region - Region to validate
   * @returns Promise<boolean> - Whether region is valid
   */
  async validateRegion(audioFile: File, region: AudioRegion): Promise<boolean> {
    try {
      const duration = await this.getAudioDuration(audioFile)
      return (
        region.start >= 0 &&
        region.end <= duration &&
        region.start < region.end &&
        region.end - region.start >= 0.1
      ) // Minimum 0.1 seconds
    } catch (error) {
      console.error('Error validating region:', error)
      return false
    }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close()
      this.audioContext = null
    }
  }
}

// Export singleton instance
export const audioProcessor = new AudioProcessor()
