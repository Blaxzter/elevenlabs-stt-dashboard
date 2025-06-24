<template>
  <div class="space-y-4">
    <div ref="dropZone"
      class="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center transition-colors hover:border-muted-foreground/50 cursor-pointer"
      :class="{
        'border-primary bg-primary/5': isDragOver,
        'border-destructive bg-destructive/5': error,
      }" @click="triggerFileInput" @drop="handleDrop" @dragover.prevent="isDragOver = true"
      @dragleave="isDragOver = false" @dragenter.prevent>
      <Upload class="mx-auto h-12 w-12 text-muted-foreground mb-4" />
      <div class="space-y-2">
        <p class="text-lg font-medium">
          Drop your audio file here, or
          <button type="button" class="text-primary hover:underline" @click="triggerFileInput">
            browse
          </button>
        </p>
        <p class="text-sm text-muted-foreground">Supports MP3, WAV, M4A, OGG (max 25MB)</p>
      </div>

      <input ref="fileInput" type="file" accept="audio/*" class="hidden" @change="handleFileSelect" />
    </div>

    <!-- File Preview -->
    <div v-if="selectedFile" class="bg-muted rounded-lg p-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <FileAudio class="h-8 w-8 text-primary" />
          <div>
            <p class="font-medium">{{ selectedFile.name }}</p>
            <p class="text-sm text-muted-foreground">
              {{ formatFileSize(selectedFile.size) }}
              <span v-if="duration"> • {{ formatDuration(duration) }}</span>
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" @click="clearFile">
          <X class="h-4 w-4" />
        </Button>
      </div> <!-- Audio Preview -->
      <div v-if="audioUrl" class="space-y-3">
        <div ref="waveformContainer" class="w-full bg-muted/30 rounded-lg min-h-[100px]"></div>

        <!-- Region Controls -->
        <div v-if="selectedRegion"
          class="flex items-center justify-between text-sm text-muted-foreground bg-muted/50 rounded p-2">
          <span>
            Selected: {{ formatDuration(selectedRegion.start) }} - {{ formatDuration(selectedRegion.end) }}
            ({{ formatDuration(selectedRegion.end - selectedRegion.start) }})
          </span>
          <Button variant="ghost" size="sm" @click="clearSelection">
            <X class="h-3 w-3 mr-1" />
            Clear
          </Button>
        </div>

        <div class="flex items-center space-x-2">
          <Button variant="outline" size="sm" @click="togglePlayback">
            <Play v-if="!isPlaying" class="h-3 w-3 mr-1" />
            <Pause v-else class="h-3 w-3 mr-1" />
            {{ isPlaying ? 'Pause' : 'Play' }}
          </Button>
          <span class="text-xs text-muted-foreground">
            Click and drag on the waveform to select a region
          </span>
        </div>
      </div>
    </div>

    <!-- Transcription Options -->
    <div v-if="selectedFile" class="bg-muted/50 rounded-lg p-4 space-y-4">
      <h3 class="font-medium flex items-center space-x-2">
        <Settings class="h-4 w-4" />
        <span>Transcription Options</span>
      </h3>

      <div class="grid md:grid-cols-2 gap-4">
        <!-- Language Selection -->
        <div class="space-y-2">
          <label class="text-sm font-medium">Language</label>
          <Select v-model="transcriptionOptions.languageCode">
            <SelectTrigger>
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="language in SUPPORTED_LANGUAGES" :key="language.code || 'auto'" :value="language.code">
                {{ language.name }}
              </SelectItem>
            </SelectContent>
          </Select>
          <p class="text-xs text-muted-foreground">
            Leave as Auto-detect for automatic language detection
          </p>
        </div>

        <!-- Model Selection -->
        <div class="space-y-2">
          <label class="text-sm font-medium">Model</label>
          <Select v-model="transcriptionOptions.modelId">
            <SelectTrigger>
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="scribe_v1">Scribe v1</SelectItem>
            </SelectContent>
          </Select>
          <p class="text-xs text-muted-foreground">Currently only Scribe v1 is supported</p>
        </div>
      </div>

      <!-- Advanced Options -->
      <div class="space-y-3">
        <div class="flex items-center space-x-2">
          <Switch id="diarize" v-model="transcriptionOptions.diarize" />
          <label for="diarize" class="text-sm font-medium">Speaker Diarization</label>
        </div>
        <p class="text-xs text-muted-foreground ml-6">
          Identify and separate different speakers in the audio
        </p>

        <div class="flex items-center space-x-2">
          <Switch id="tag-events" v-model="transcriptionOptions.tagAudioEvents" />
          <label for="tag-events" class="text-sm font-medium">Tag Audio Events</label>
        </div>
        <p class="text-xs text-muted-foreground ml-6">
          Identify non-speech audio events like laughter, applause, etc.
        </p>
      </div>
    </div>

    <!-- Error Message -->
    <Alert v-if="error" variant="destructive">
      <AlertCircle class="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted, nextTick } from 'vue'
import { Upload, FileAudio, X, AlertCircle, Settings, Play, Pause } from 'lucide-vue-next'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SUPPORTED_LANGUAGES, type TranscriptionOptions } from '@/lib/elevenlabs-api'

interface Region {
  id: string
  start: number
  end: number
  remove?: () => void
}

interface AudioFileInputProps {
  modelValue?: File | null
  transcriptionOptions?: TranscriptionOptions
}

interface AudioFileInputEmits {
  (e: 'update:modelValue', value: File | null): void
  (e: 'update:transcriptionOptions', value: TranscriptionOptions): void
  (e: 'update:selectedRegion', region: { start: number; end: number } | null): void
  (e: 'file-selected', file: File): void
  (e: 'error', error: string): void
}

const props = withDefaults(defineProps<AudioFileInputProps>(), {
  modelValue: null,
  transcriptionOptions: () => ({
    modelId: 'scribe_v1',
    tagAudioEvents: true,
    languageCode: null,
    diarize: true,
  }),
})

const emit = defineEmits<AudioFileInputEmits>()

const dropZone = ref<HTMLDivElement>()
const fileInput = ref<HTMLInputElement>()
const waveformContainer = ref<HTMLDivElement>()
const wavesurfer = ref<WaveSurfer | null>(null)
const regionsPlugin = ref<RegionsPlugin | null>(null)
const selectedFile = ref<File | null>(null)
const audioUrl = ref<string | null>(null)
const duration = ref<number | null>(null)
const isDragOver = ref(false)
const error = ref<string | null>(null)
const isPlaying = ref(false)
const selectedRegion = ref<{ start: number; end: number } | null>(null)

// Local transcription options
const transcriptionOptions = ref<TranscriptionOptions>({
  modelId: 'scribe_v1',
  tagAudioEvents: true,
  languageCode: null,
  diarize: true,
  ...props.transcriptionOptions,
})

// Audio file validation
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB
const ALLOWED_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/m4a',
  'audio/ogg',
  'audio/webm',
  'audio/flac',
]

function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return 'File size must be less than 25MB'
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Unsupported file type. Please use MP3, WAV, M4A, OGG, or FLAC'
  }

  return null
}

function setFile(file: File) {
  const validationError = validateFile(file)
  if (validationError) {
    error.value = validationError
    emit('error', validationError)
    return
  }

  error.value = null
  selectedFile.value = file

  // Create audio URL for preview
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }
  audioUrl.value = URL.createObjectURL(file)

  // Initialize WaveSurfer
  nextTick(() => {
    initializeWaveSurfer()
  })

  emit('update:modelValue', file)
  emit('file-selected', file)
}

async function initializeWaveSurfer() {
  if (!waveformContainer.value || !audioUrl.value) return
  // Destroy existing instance
  if (wavesurfer.value) {
    wavesurfer.value.destroy()
  }

  // Create regions plugin first
  regionsPlugin.value = RegionsPlugin.create()

  wavesurfer.value = WaveSurfer.create({
    container: waveformContainer.value,
    waveColor: 'rgb(148, 163, 184)', // slate-400
    progressColor: 'rgb(59, 130, 246)', // blue-500
    cursorColor: 'rgb(239, 68, 68)', // red-500
    barWidth: 2,
    barRadius: 1,
    height: 100,
    normalize: true,
    backend: 'WebAudio',
    mediaControls: false,
    interact: true,
    minPxPerSec: 30, // Lower for faster loading
  })  // Register the regions plugin
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wavesurfer.value.registerPlugin(regionsPlugin.value as any)


  // Set up event listeners
  wavesurfer.value.on('ready', () => {
    duration.value = wavesurfer.value?.getDuration() || 0
  })

  wavesurfer.value.on('play', () => {
    isPlaying.value = true
  })

  wavesurfer.value.on('pause', () => {
    isPlaying.value = false
  })

  wavesurfer.value.on('finish', () => {
    isPlaying.value = false
  })

  // Enable region creation on double click
  wavesurfer.value.on('interaction', () => {
    regionsPlugin.value?.enableDragSelection({
      color: 'rgba(59, 130, 246, 0.2)', // blue with opacity
    })
  })  // Handle region creation
  regionsPlugin.value?.on('region-created', (region: Region) => {
    // Clear previous regions (only allow one selection)
    const regions = regionsPlugin.value?.getRegions() || []
    regions.forEach((r: Region) => {
      if (r && r.id !== region.id) {
        safeRemoveRegion(r)
      }
    })

    selectedRegion.value = {
      start: region.start,
      end: region.end
    }
    emit('update:selectedRegion', selectedRegion.value)
  })

  // Handle region updates
  regionsPlugin.value?.on('region-updated', (region: Region) => {
    selectedRegion.value = {
      start: region.start,
      end: region.end
    }
    emit('update:selectedRegion', selectedRegion.value)
  })
  // Load audio
  await wavesurfer.value.load(audioUrl.value)
}

function safeRemoveRegion(region: Region) {
  if (region && typeof region.remove === 'function') {
    try {
      region.remove()
    } catch (error) {
      console.warn('Error removing region:', error)
    }
  }
}

function clearFile() {
  selectedFile.value = null
  duration.value = null
  selectedRegion.value = null

  if (wavesurfer.value) {
    wavesurfer.value.destroy()
    wavesurfer.value = null
  }

  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
    audioUrl.value = null
  }

  if (fileInput.value) {
    fileInput.value.value = ''
  }

  emit('update:modelValue', null)
  emit('update:selectedRegion', null)
}

function togglePlayback() {
  if (!wavesurfer.value) return

  if (wavesurfer.value.isPlaying()) {
    wavesurfer.value.pause()
  } else {
    wavesurfer.value.play()
  }
}

function clearSelection() {

  if (regionsPlugin.value) {
    try {
      regionsPlugin.value.clearRegions()
    } catch (error) {
      console.warn('Error clearing regions:', error)
    }
  }
  selectedRegion.value = null
  emit('update:selectedRegion', null)
}

function triggerFileInput() {
  fileInput.value?.click()
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    setFile(target.files[0])
  }
}

function handleDrop(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = false

  const files = event.dataTransfer?.files
  if (files && files[0]) {
    setFile(files[0])
  }
}

function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 Bytes'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

// Watch for external changes to modelValue
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue !== selectedFile.value) {
      if (newValue) {
        setFile(newValue)
      } else {
        clearFile()
      }
    }
  },
)

// Track if we're updating from props to prevent loop
const isUpdatingFromProps = ref(false)

// Watch for changes to transcription options and emit them
watch(
  transcriptionOptions,
  (newOptions) => {
    // Don't emit if we're currently updating from props
    if (!isUpdatingFromProps.value) {
      emit('update:transcriptionOptions', newOptions)
    }
  },
  { deep: true },
)

// Watch for external changes to transcription options
watch(
  () => props.transcriptionOptions,
  (newOptions) => {
    if (newOptions) {
      // Set flag to prevent emission loop
      isUpdatingFromProps.value = true
      transcriptionOptions.value = { ...newOptions }
      // Reset flag on next tickFStart Transcript
      nextTick(() => {
        isUpdatingFromProps.value = false
      })
    }
  },
  { deep: true },
)

// Cleanup on unmount
onUnmounted(() => {
  if (wavesurfer.value) {
    wavesurfer.value.destroy()
  }
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }
})
</script>
