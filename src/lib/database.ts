// IndexedDB service for storing transcriptions and audio files
export interface TranscriptionData {
  id: string
  filename: string
  fileSize: number
  createdAt: Date
  duration?: number
  apiResponse: ElevenLabsSTTResponse | null
  audioBlob: Blob
  status: 'pending' | 'processing' | 'completed' | 'error'
  error?: string
}

export interface ElevenLabsSTTResponse {
  languageCode: string
  languageProbability: number
  text: string
  words: Array<{
    text: string
    start: number
    end: number
    type: 'word' | 'spacing'
    speakerId: string
    logprob: number
    characters: unknown[] | null
  }>
}

class DatabaseService {
  private db: IDBDatabase | null = null
  private readonly dbName = 'elevenlabs-stt-dashboard'
  private readonly version = 1

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create transcriptions store
        if (!db.objectStoreNames.contains('transcriptions')) {
          const transcriptionsStore = db.createObjectStore('transcriptions', {
            keyPath: 'id',
          })
          transcriptionsStore.createIndex('createdAt', 'createdAt', { unique: false })
          transcriptionsStore.createIndex('filename', 'filename', { unique: false })
          transcriptionsStore.createIndex('status', 'status', { unique: false })
        }

        // Create settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' })
        }
      }
    })
  }

  async saveTranscription(transcription: TranscriptionData): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['transcriptions'], 'readwrite')
      const store = transaction.objectStore('transcriptions')

      try {
        // Create a clean, serializable copy of the transcription
        const transcriptionCopy: TranscriptionData = {
          id: transcription.id,
          filename: transcription.filename,
          fileSize: transcription.fileSize,
          createdAt: transcription.createdAt,
          duration: transcription.duration,
          apiResponse: transcription.apiResponse
            ? {
                languageCode: transcription.apiResponse.languageCode,
                languageProbability: transcription.apiResponse.languageProbability,
                text: transcription.apiResponse.text,
                words: transcription.apiResponse.words.map((w) => ({ ...w })),
              }
            : null,
          audioBlob: transcription.audioBlob,
          status: transcription.status,
          error: transcription.error,
        }

        const request = store.put(transcriptionCopy)

        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve()
      } catch (err) {
        console.error('Error preparing transcription for storage:', err)
        reject(err)
      }
    })
  }

  async getTranscription(id: string): Promise<TranscriptionData | null> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['transcriptions'], 'readonly')
      const store = transaction.objectStore('transcriptions')
      const request = store.get(id)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || null)
    })
  }

  async getAllTranscriptions(): Promise<TranscriptionData[]> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['transcriptions'], 'readonly')
      const store = transaction.objectStore('transcriptions')
      const index = store.index('createdAt')
      const request = index.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const results = request.result.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        resolve(results)
      }
    })
  }

  async deleteTranscription(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['transcriptions'], 'readwrite')
      const store = transaction.objectStore('transcriptions')
      const request = store.delete(id)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async saveSetting(key: string, value: unknown): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['settings'], 'readwrite')
      const store = transaction.objectStore('settings')
      const request = store.put({ key, value })

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getSetting(key: string): Promise<unknown> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['settings'], 'readonly')
      const store = transaction.objectStore('settings')
      const request = store.get(key)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result?.value || null)
    })
  }
}

export const db = new DatabaseService()
