import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'
import type { ElevenLabsSTTResponse } from './database'

export interface TranscriptionOptions {
  modelId?: string
  tagAudioEvents?: boolean
  languageCode?: string | null
  diarize?: boolean
}

export class ElevenLabsAPIService {
  private client: ElevenLabsClient | null = null

  private initializeClient(apiKey: string): ElevenLabsClient {
    if (!this.client) {
      this.client = new ElevenLabsClient({
        apiKey: apiKey,
      })
    }
    return this.client
  }

  async transcribeAudio(
    audioFile: File,
    apiKey: string,
    options: TranscriptionOptions = {},
  ): Promise<ElevenLabsSTTResponse> {
    const client = this.initializeClient(apiKey)

    const {
      modelId = 'scribe_v1',
      tagAudioEvents = true,
      languageCode = null,
      diarize = true,
    } = options

    try {
      // Convert File to Blob if needed
      const audioBlob = new Blob([await audioFile.arrayBuffer()], {
        type: audioFile.type,
      })

      const transcription = await client.speechToText.convert({
        file: audioBlob,
        modelId,
        tagAudioEvents,
        languageCode: languageCode || undefined,
        diarize,
      })

      return transcription as unknown as ElevenLabsSTTResponse
    } catch (error) {
      console.error('ElevenLabs API Error:', error)

      if (error instanceof Error) {
        if (
          error.message.includes('missing_permissions') &&
          error.message.includes('speech_to_text')
        ) {
          throw new Error(
            'API key is missing speech_to_text permissions. Please check your ElevenLabs API key permissions.',
          )
        } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          throw new Error('Invalid API key')
        } else if (error.message.includes('400') || error.message.includes('Bad Request')) {
          throw new Error('Invalid audio file or request parameters')
        } else if (error.message.includes('429') || error.message.includes('Rate limit')) {
          throw new Error('Rate limit exceeded')
        } else if (error.message.includes('timeout')) {
          throw new Error('Request timeout - file may be too large')
        }
      }

      throw new Error(
        'Failed to transcribe audio: ' + (error instanceof Error ? error.message : 'Unknown error'),
      )
    }
  }

  validateApiKey(apiKey: string): boolean {
    return apiKey.length > 0 && apiKey.trim() !== ''
  }

  getAudioDuration(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const audio = new Audio()
      const url = URL.createObjectURL(file)

      audio.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(url)
        resolve(audio.duration)
      })

      audio.addEventListener('error', () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load audio file'))
      })

      audio.src = url
    })
  }
}

export const elevenLabsAPI = new ElevenLabsAPIService()

// Supported languages for ElevenLabs STT
export const SUPPORTED_LANGUAGES = [
  { code: null, name: 'Auto-detect' },
  { code: 'afr', name: 'Afrikaans' },
  { code: 'amh', name: 'Amharic' },
  { code: 'ara', name: 'Arabic' },
  { code: 'hye', name: 'Armenian' },
  { code: 'asm', name: 'Assamese' },
  { code: 'ast', name: 'Asturian' },
  { code: 'aze', name: 'Azerbaijani' },
  { code: 'bel', name: 'Belarusian' },
  { code: 'ben', name: 'Bengali' },
  { code: 'bos', name: 'Bosnian' },
  { code: 'bul', name: 'Bulgarian' },
  { code: 'mya', name: 'Burmese' },
  { code: 'yue', name: 'Cantonese' },
  { code: 'cat', name: 'Catalan' },
  { code: 'ceb', name: 'Cebuano' },
  { code: 'nya', name: 'Chichewa' },
  { code: 'hrv', name: 'Croatian' },
  { code: 'ces', name: 'Czech' },
  { code: 'dan', name: 'Danish' },
  { code: 'nld', name: 'Dutch' },
  { code: 'eng', name: 'English' },
  { code: 'est', name: 'Estonian' },
  { code: 'fil', name: 'Filipino' },
  { code: 'fin', name: 'Finnish' },
  { code: 'fra', name: 'French' },
  { code: 'ful', name: 'Fulah' },
  { code: 'glg', name: 'Galician' },
  { code: 'lug', name: 'Ganda' },
  { code: 'kat', name: 'Georgian' },
  { code: 'deu', name: 'German' },
  { code: 'ell', name: 'Greek' },
  { code: 'guj', name: 'Gujarati' },
  { code: 'hau', name: 'Hausa' },
  { code: 'heb', name: 'Hebrew' },
  { code: 'hin', name: 'Hindi' },
  { code: 'hun', name: 'Hungarian' },
  { code: 'isl', name: 'Icelandic' },
  { code: 'ibo', name: 'Igbo' },
  { code: 'ind', name: 'Indonesian' },
  { code: 'gle', name: 'Irish' },
  { code: 'ita', name: 'Italian' },
  { code: 'jpn', name: 'Japanese' },
  { code: 'jav', name: 'Javanese' },
  { code: 'kea', name: 'Kabuverdianu' },
  { code: 'kan', name: 'Kannada' },
  { code: 'kaz', name: 'Kazakh' },
  { code: 'khm', name: 'Khmer' },
  { code: 'kor', name: 'Korean' },
  { code: 'kur', name: 'Kurdish' },
  { code: 'kir', name: 'Kyrgyz' },
  { code: 'lao', name: 'Lao' },
  { code: 'lav', name: 'Latvian' },
  { code: 'lin', name: 'Lingala' },
  { code: 'lit', name: 'Lithuanian' },
  { code: 'luo', name: 'Luo' },
  { code: 'ltz', name: 'Luxembourgish' },
  { code: 'mkd', name: 'Macedonian' },
  { code: 'msa', name: 'Malay' },
  { code: 'mal', name: 'Malayalam' },
  { code: 'mlt', name: 'Maltese' },
  { code: 'cmn', name: 'Mandarin Chinese' },
  { code: 'mri', name: 'Māori' },
  { code: 'mar', name: 'Marathi' },
  { code: 'mon', name: 'Mongolian' },
  { code: 'nep', name: 'Nepali' },
  { code: 'nso', name: 'Northern Sotho' },
  { code: 'nor', name: 'Norwegian' },
  { code: 'oci', name: 'Occitan' },
  { code: 'ori', name: 'Odia' },
  { code: 'pus', name: 'Pashto' },
  { code: 'fas', name: 'Persian' },
  { code: 'pol', name: 'Polish' },
  { code: 'por', name: 'Portuguese' },
  { code: 'pan', name: 'Punjabi' },
  { code: 'ron', name: 'Romanian' },
  { code: 'rus', name: 'Russian' },
  { code: 'srp', name: 'Serbian' },
  { code: 'sna', name: 'Shona' },
  { code: 'snd', name: 'Sindhi' },
  { code: 'slk', name: 'Slovak' },
  { code: 'slv', name: 'Slovenian' },
  { code: 'som', name: 'Somali' },
  { code: 'spa', name: 'Spanish' },
  { code: 'swa', name: 'Swahili' },
  { code: 'swe', name: 'Swedish' },
  { code: 'tam', name: 'Tamil' },
  { code: 'tgk', name: 'Tajik' },
  { code: 'tel', name: 'Telugu' },
  { code: 'tha', name: 'Thai' },
  { code: 'tur', name: 'Turkish' },
  { code: 'ukr', name: 'Ukrainian' },
  { code: 'umb', name: 'Umbundu' },
  { code: 'urd', name: 'Urdu' },
  { code: 'uzb', name: 'Uzbek' },
  { code: 'vie', name: 'Vietnamese' },
  { code: 'cym', name: 'Welsh' },
  { code: 'wol', name: 'Wolof' },
  { code: 'xho', name: 'Xhosa' },
  { code: 'zul', name: 'Zulu' },
] as const
