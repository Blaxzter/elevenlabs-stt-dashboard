import { ref, computed, onMounted } from 'vue'
import { db, type TranscriptionData } from '@/lib/database'
import { elevenLabsAPI, type TranscriptionOptions } from '@/lib/elevenlabs-api'

export function useTranscriptions() {
  const transcriptions = ref<TranscriptionData[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Computed properties
  const completedTranscriptions = computed(() =>
    transcriptions.value.filter((t) => t.status === 'completed'),
  )

  const processingTranscriptions = computed(() =>
    transcriptions.value.filter((t) => t.status === 'processing'),
  )

  const errorTranscriptions = computed(() =>
    transcriptions.value.filter((t) => t.status === 'error'),
  )

  // Load all transcriptions from database
  async function loadTranscriptions() {
    try {
      loading.value = true
      error.value = null
      await db.init()
      transcriptions.value = await db.getAllTranscriptions()
    } catch (err) {
      error.value = 'Failed to load transcriptions'
      console.error('Error loading transcriptions:', err)
    } finally {
      loading.value = false
    }
  }

  // Create new transcription
  async function createTranscription(
    audioFile: File,
    apiKey: string,
    options: TranscriptionOptions = {},
  ): Promise<string> {
    const id = crypto.randomUUID()

    try {
      await db.init()

      // Get audio duration
      const duration = await elevenLabsAPI.getAudioDuration(audioFile)

      // Create initial transcription record
      // Convert File to Blob to ensure it's serializable
      const audioBlob = new Blob([await audioFile.arrayBuffer()], { type: audioFile.type })

      const transcription: TranscriptionData = {
        id,
        filename: audioFile.name,
        fileSize: audioFile.size,
        createdAt: new Date(),
        duration,
        apiResponse: null,
        audioBlob,
        status: 'processing',
      }

      // Save to database
      await db.saveTranscription(transcription)

      // Update local state
      transcriptions.value.unshift(transcription)

      // Start transcription process
      processTranscription(id, audioFile, apiKey, options)

      return id
    } catch (err) {
      error.value = 'Failed to create transcription'
      console.error('Error creating transcription:', err)
      throw err
    }
  }

  // Process transcription with ElevenLabs API
  async function processTranscription(
    id: string,
    audioFile: File,
    apiKey: string,
    options: TranscriptionOptions = {},
  ) {
    try {
      await db.init()

      // Call ElevenLabs API
      const apiResponse = await elevenLabsAPI.transcribeAudio(audioFile, apiKey, options)

      // Update transcription with results
      const transcription = transcriptions.value.find((t) => t.id === id)
      if (transcription) {
        transcription.apiResponse = apiResponse
        transcription.status = 'completed'

        // Save to database
        await db.saveTranscription(transcription)
      }
    } catch (err) {
      // Update transcription with error
      const transcription = transcriptions.value.find((t) => t.id === id)
      if (transcription) {
        transcription.status = 'error'
        transcription.error = err instanceof Error ? err.message : 'Unknown error'

        // Save to database
        await db.saveTranscription(transcription)
      }

      console.error('Error processing transcription:', err)
    }
  }

  // Delete transcription
  async function deleteTranscription(id: string) {
    try {
      await db.init()
      await db.deleteTranscription(id)
      transcriptions.value = transcriptions.value.filter((t) => t.id !== id)
    } catch (err) {
      error.value = 'Failed to delete transcription'
      console.error('Error deleting transcription:', err)
      throw err
    }
  }

  // Get single transcription
  async function getTranscription(id: string): Promise<TranscriptionData | null> {
    try {
      await db.init()
      return await db.getTranscription(id)
    } catch (err) {
      error.value = 'Failed to load transcription'
      console.error('Error loading transcription:', err)
      return null
    }
  }

  // Retry failed transcription
  async function retryTranscription(id: string, apiKey: string) {
    await db.init()
    const transcription = transcriptions.value.find((t) => t.id === id)
    if (!transcription) return

    transcription.status = 'processing'
    transcription.error = undefined
    await db.saveTranscription(transcription)

    // Convert blob back to File for retry
    const file = new File([transcription.audioBlob], transcription.filename)
    await processTranscription(id, file, apiKey)
  }

  // Format file size for display
  function formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
  }

  // Format duration for display
  function formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Initialize on mount
  onMounted(() => {
    loadTranscriptions()
  })

  return {
    transcriptions,
    loading,
    error,
    completedTranscriptions,
    processingTranscriptions,
    errorTranscriptions,
    loadTranscriptions,
    createTranscription,
    deleteTranscription,
    getTranscription,
    retryTranscription,
    formatFileSize,
    formatDuration,
  }
}
