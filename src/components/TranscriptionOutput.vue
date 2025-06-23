<template>
  <div class="space-y-4">
    <!-- Controls -->
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <div class="flex items-center space-x-2">
          <Switch id="view-mode" v-model="isJsonView" />
          <label for="view-mode" class="text-sm font-medium">
            {{ isJsonView ? 'JSON View' : 'Text View' }}
          </label>
        </div>

        <div v-if="!isJsonView && transcription?.apiResponse" class="flex items-center space-x-2">
          <Switch id="word-sync" v-model="wordSyncEnabled" />
          <label for="word-sync" class="text-sm font-medium"> Word Sync </label>
        </div>
      </div>

      <div class="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          @click="copyToClipboard"
          :disabled="!transcription?.apiResponse"
        >
          <Copy class="h-4 w-4 mr-2" />
          Copy
        </Button>

        <Button
          variant="outline"
          size="sm"
          @click="exportTranscription"
          :disabled="!transcription?.apiResponse"
        >
          <Download class="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>
    </div>

    <!-- Content -->
    <div class="border rounded-lg p-4 min-h-[200px] bg-muted/30">
      <!-- Loading State -->
      <div
        v-if="transcription?.status === 'processing'"
        class="flex items-center justify-center h-32"
      >
        <div class="text-center space-y-2">
          <Loader2 class="h-8 w-8 animate-spin mx-auto text-primary" />
          <p class="text-sm text-muted-foreground">Processing transcription...</p>
        </div>
      </div>

      <!-- Error State -->
      <div
        v-else-if="transcription?.status === 'error'"
        class="flex items-center justify-center h-32"
      >
        <Alert variant="destructive" class="max-w-md">
          <AlertCircle class="h-4 w-4" />
          <AlertTitle>Transcription Failed</AlertTitle>
          <AlertDescription>{{ transcription.error || 'Unknown error occurred' }}</AlertDescription>
        </Alert>
      </div>

      <!-- No transcription -->
      <div v-else-if="!transcription?.apiResponse" class="flex items-center justify-center h-32">
        <div class="text-center space-y-2">
          <FileText class="h-8 w-8 mx-auto text-muted-foreground" />
          <p class="text-sm text-muted-foreground">Upload an audio file to see transcription</p>
        </div>
      </div>

      <!-- JSON View -->
      <div v-else-if="isJsonView" class="space-y-4">
        <div class="flex items-center space-x-2">
          <Badge variant="secondary">
            {{ transcription.apiResponse.languageCode }}
          </Badge>
          <Badge variant="outline">
            Confidence: {{ Math.round(transcription.apiResponse.languageProbability * 100) }}%
          </Badge>
        </div>

        <pre class="bg-background p-3 rounded text-xs overflow-auto max-h-96 border">{{
          JSON.stringify(transcription.apiResponse, null, 2)
        }}</pre>
      </div>

      <!-- Text View -->
      <div v-else class="space-y-4">        <div class="flex items-center flex-wrap gap-2">
          <Badge variant="secondary">
            {{ transcription.apiResponse.languageCode }}
          </Badge>
          <Badge variant="outline">
            Confidence: {{ Math.round(transcription.apiResponse.languageProbability * 100) }}%
          </Badge>          <Badge variant="outline">
            {{ transcription.apiResponse.words.filter((w) => w.type === 'word').length }} words
          </Badge>
          <Badge variant="outline" v-if="speakerSegments.length > 1">
            {{ speakerSegments.length }} speakers
          </Badge>
          <Badge variant="outline" v-if="speakerSegments.length > 1">
            {{ speakerSegments.length }} segments
          </Badge>
        </div>        <!-- Interactive Text with Speaker Segments -->
        <div class="max-h-96 overflow-auto space-y-3">
          <p v-if="wordSyncEnabled" class="text-xs text-muted-foreground mb-3">
            Click on words to jump to audio position
          </p>

          <!-- Speaker Legend -->
          <div v-if="speakerSegments.length > 1" class="flex flex-wrap gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
            <div class="text-xs font-medium text-muted-foreground mb-1 w-full">Speakers:</div>
            <div
              v-for="speakerId in uniqueSpeakers"
              :key="speakerId"
              class="flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium"
              :class="getSpeakerStyle(speakerId)"
            >
              <div
                class="w-2 h-2 rounded-full"
                :class="getSpeakerDotColor(speakerId)"
              ></div>
              <span>{{ getSpeakerLabel(speakerId) }}</span>
              <span class="text-xs opacity-75">
                ({{ getSpeakerWordCount(speakerId) }} words)
              </span>
            </div>
          </div>

          <div class="space-y-4">
            <div
              v-for="(segment, segmentIndex) in speakerSegments"
              :key="segmentIndex"
              class="relative"
            >
              <!-- Speaker Header -->
              <div class="flex items-center gap-2 mb-2">
                <div
                  class="flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium"
                  :class="getSpeakerStyle(segment.speakerId)"
                >
                  <div
                    class="w-2 h-2 rounded-full"
                    :class="getSpeakerDotColor(segment.speakerId)"
                  ></div>
                  <span>{{ getSpeakerLabel(segment.speakerId) }}</span>
                </div>
                <span class="text-xs text-muted-foreground">
                  {{ formatTime(segment.startTime) }} - {{ formatTime(segment.endTime) }}
                </span>
              </div>

              <!-- Speaker Text -->
              <div
                class="pl-4 border-l-2 leading-relaxed text-sm select-text"
                :class="getSpeakerBorderColor(segment.speakerId)"
              >
                <template v-for="(word, wordIndex) in segment.words" :key="wordIndex">
                  <span
                    v-if="word.type === 'word'"
                    :class="{
                      'hover:bg-primary/20 rounded px-0.5 cursor-pointer transition-colors':
                        wordSyncEnabled,
                      'bg-primary/30 text-primary-foreground rounded px-0.5': isCurrentWord(word),
                      'bg-yellow-200 text-yellow-900 rounded px-0.5':
                        highlightedWord === word.originalIndex,
                    }"
                    @click="wordSyncEnabled && $emit('word-clicked', word.start)"
                    @mouseenter="highlightedWord = word.originalIndex"
                    @mouseleave="highlightedWord = null"
                    :title="
                      wordSyncEnabled
                        ? `${word.start.toFixed(2)}s - ${word.end.toFixed(2)}s (${word.speakerId})`
                        : undefined
                    "
                    >{{ word.text }}</span
                  ><span v-else-if="word.type === 'spacing'">{{ word.text }}</span>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Copy, Download, Loader2, AlertCircle, FileText } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import type { TranscriptionData } from '@/lib/database'

interface Word {
  text: string
  start: number
  end: number
  type: 'word' | 'spacing'
  speakerId: string
  logprob: number
}

interface WordWithIndex extends Word {
  originalIndex: number
}

interface SpeakerSegment {
  speakerId: string
  startTime: number
  endTime: number
  words: WordWithIndex[]
}

interface TranscriptionOutputProps {
  transcription?: TranscriptionData | null
  currentTime?: number
  wordSyncEnabled?: boolean
}

interface TranscriptionOutputEmits {
  (e: 'word-clicked', time: number): void
  (e: 'update:wordSyncEnabled', enabled: boolean): void
}

const props = withDefaults(defineProps<TranscriptionOutputProps>(), {
  transcription: null,
  currentTime: 0,
  wordSyncEnabled: false,
})

const emit = defineEmits<TranscriptionOutputEmits>()

const isJsonView = ref(false)
const highlightedWord = ref<number | null>(null)

const wordSyncEnabled = computed({
  get: () => props.wordSyncEnabled,
  set: (value) => emit('update:wordSyncEnabled', value),
})

// Process words into speaker segments
const speakerSegments = computed(() => {
  if (!props.transcription?.apiResponse?.words) return []

  const segments: SpeakerSegment[] = []
  let currentSegment: SpeakerSegment | null = null

  props.transcription.apiResponse.words.forEach((word: Word, index: number) => {
    // Add original index for highlighting
    const wordWithIndex: WordWithIndex = { ...word, originalIndex: index }

    if (!currentSegment || currentSegment.speakerId !== word.speakerId) {
      // Start new segment
      if (currentSegment) {
        segments.push(currentSegment)
      }
      currentSegment = {
        speakerId: word.speakerId,
        startTime: word.start || 0,
        endTime: word.end || 0,
        words: [wordWithIndex],
      }
    } else {
      // Continue current segment
      currentSegment.words.push(wordWithIndex)
      currentSegment.endTime = word.end || currentSegment.endTime
    }
  })

  if (currentSegment) {
    segments.push(currentSegment)
  }
  return segments
})

// Get unique speakers
const uniqueSpeakers = computed(() => {
  const speakers = new Set<string>()
  speakerSegments.value.forEach(segment => {
    speakers.add(segment.speakerId)
  })
  return Array.from(speakers).sort()
})

// Get word count for each speaker
function getSpeakerWordCount(speakerId: string): number {
  if (!props.transcription?.apiResponse?.words) return 0
  return props.transcription.apiResponse.words.filter(
    (word: Word) => word.type === 'word' && word.speakerId === speakerId
  ).length
}

// Speaker styling
const speakerColors = [
  {
    style: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    dot: 'bg-blue-500',
    border: 'border-blue-200 dark:border-blue-700',
  },
  {
    style: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    dot: 'bg-green-500',
    border: 'border-green-200 dark:border-green-700',
  },
  {
    style: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    dot: 'bg-purple-500',
    border: 'border-purple-200 dark:border-purple-700',
  },
  {
    style: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    dot: 'bg-orange-500',
    border: 'border-orange-200 dark:border-orange-700',
  },
  {
    style: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    dot: 'bg-pink-500',
    border: 'border-pink-200 dark:border-pink-700',
  },
]

function getSpeakerColorIndex(speakerId: string): number {
  // Extract number from speaker ID or use hash
  const match = speakerId.match(/\d+/)
  if (match) {
    return parseInt(match[0]) % speakerColors.length
  }
  // Fallback to simple hash
  let hash = 0
  for (let i = 0; i < speakerId.length; i++) {
    hash = speakerId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % speakerColors.length
}

function getSpeakerStyle(speakerId: string): string {
  return speakerColors[getSpeakerColorIndex(speakerId)].style
}

function getSpeakerDotColor(speakerId: string): string {
  return speakerColors[getSpeakerColorIndex(speakerId)].dot
}

function getSpeakerBorderColor(speakerId: string): string {
  return speakerColors[getSpeakerColorIndex(speakerId)].border
}

function getSpeakerLabel(speakerId: string): string {
  const match = speakerId.match(/speaker_(\d+)/)
  if (match) {
    return `Speaker ${parseInt(match[1]) + 1}`
  }
  return speakerId.charAt(0).toUpperCase() + speakerId.slice(1)
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Find current word based on audio time
function isCurrentWord(word: Word | WordWithIndex): boolean {
  return props.currentTime >= word.start && props.currentTime <= word.end
}

// Copy transcription to clipboard
async function copyToClipboard() {
  if (!props.transcription?.apiResponse) return

  try {
    const text = isJsonView.value
      ? JSON.stringify(props.transcription.apiResponse, null, 2)
      : props.transcription.apiResponse.text

    await navigator.clipboard.writeText(text)
    // Could emit a toast notification here
  } catch (err) {
    console.error('Failed to copy to clipboard:', err)
  }
}

// Export transcription in various formats
function exportTranscription() {
  if (!props.transcription?.apiResponse) return

  const response = props.transcription.apiResponse
  const filename = props.transcription.filename.replace(/\.[^/.]+$/, '')
  // Create different export formats
  const formats = [
    {
      name: 'Text (.txt)',
      content: response.text,
      type: 'text/plain',
      extension: 'txt',
    },
    {
      name: 'JSON (.json)',
      content: JSON.stringify(response, null, 2),
      type: 'application/json',
      extension: 'json',
    },
    {
      name: 'SRT (.srt)',
      content: generateSRT(response.words),
      type: 'text/plain',
      extension: 'srt',
    },
    {
      name: 'Speaker Text (.txt)',
      content: generateSpeakerText(response.words),
      type: 'text/plain',
      extension: 'txt',
    },
  ]

  // For now, just export as text. Could add a format selector later
  const format = formats[0]
  const blob = new Blob([format.content], { type: format.type })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}_transcription.${format.extension}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Generate SRT subtitle format
function generateSRT(words: Word[]): string {
  const sentences: Array<{ text: string; start: number; end: number; speakerId?: string }> = []
  let currentSentence = { text: '', start: 0, end: 0, speakerId: '' }

  words.forEach((word, index) => {
    if (word.type === 'word') {
      if (currentSentence.text === '') {
        currentSentence.start = word.start
        currentSentence.speakerId = word.speakerId
      }
      currentSentence.text += word.text
      currentSentence.end = word.end

      // End sentence on speaker change, punctuation, or every 10 words
      const shouldEndSentence = 
        word.speakerId !== currentSentence.speakerId ||
        word.text.match(/[.!?]/) || 
        (index + 1) % 10 === 0

      if (shouldEndSentence) {
        sentences.push({ ...currentSentence })
        currentSentence = { text: '', start: 0, end: 0, speakerId: word.speakerId }
      }
    } else if (word.type === 'spacing' && currentSentence.text !== '') {
      currentSentence.text += word.text
    }
  })

  if (currentSentence.text !== '') {
    sentences.push(currentSentence)
  }

  return sentences
    .map((sentence, index) => {
      const startTime = formatSRTTime(sentence.start)
      const endTime = formatSRTTime(sentence.end)
      const speakerPrefix = sentence.speakerId ? `[${getSpeakerLabel(sentence.speakerId)}] ` : ''
      return `${index + 1}\n${startTime} --> ${endTime}\n${speakerPrefix}${sentence.text.trim()}\n`
    })
    .join('\n')
}

function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`
}

// Generate speaker-separated text format
function generateSpeakerText(words: Word[]): string {
  let result = ''
  let currentSpeaker = ''
  let currentText = ''

  words.forEach((word) => {
    if (word.type === 'word') {
      if (currentSpeaker !== word.speakerId) {
        if (currentText.trim()) {
          result += `${getSpeakerLabel(currentSpeaker)}: ${currentText.trim()}\n\n`
        }
        currentSpeaker = word.speakerId
        currentText = word.text
      } else {
        currentText += word.text
      }
    } else if (word.type === 'spacing') {
      currentText += word.text
    }
  })

  if (currentText.trim()) {
    result += `${getSpeakerLabel(currentSpeaker)}: ${currentText.trim()}\n`
  }

  return result
}
</script>
