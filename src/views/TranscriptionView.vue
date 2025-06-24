<template>
  <div class="container mx-auto px-4 py-8 max-w-6xl">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center min-h-[400px]">
      <div class="text-center space-y-2">
        <Loader2 class="h-8 w-8 animate-spin mx-auto text-primary" />
        <p class="text-muted-foreground">Loading transcription...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error || !transcription" class="flex items-center justify-center min-h-[400px]">
      <Alert variant="destructive" class="max-w-md">
        <AlertCircle class="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {{ error || 'Transcription not found' }}
        </AlertDescription>
      </Alert>
    </div>

    <!-- Transcription Content -->
    <div v-else class="space-y-6">
      <!-- Header -->
      <div class="flex items-start justify-between">
        <div>
          <Button variant="ghost" @click="goBack" class="mb-4 -ml-4">
            <ArrowLeft class="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <div class="space-y-2">
            <h1 class="text-3xl font-bold">{{ transcription.filename }}</h1>
            <div class="flex items-center space-x-4 text-sm text-muted-foreground">
              <span class="flex items-center space-x-1">
                <Calendar class="h-4 w-4" />
                <span>{{ formatDate(transcription.createdAt) }}</span>
              </span>
              <span class="flex items-center space-x-1">
                <Clock class="h-4 w-4" />
                <span>{{ formatDuration(transcription.duration || 0) }}</span>
              </span>
              <span class="flex items-center space-x-1">
                <HardDrive class="h-4 w-4" />
                <span>{{ formatFileSize(transcription.fileSize) }}</span>
              </span>
              <Badge :variant="getStatusVariant(transcription.status)">
                {{ getStatusText(transcription.status) }}
              </Badge>
            </div>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <ThemeToggle variant="button" />
          <Button variant="outline" size="sm" @click="retryTranscription" v-if="transcription.status === 'error'">
            <RefreshCw class="h-4 w-4 mr-2" />
            Retry
          </Button>

          <Button variant="outline" size="sm" @click="deleteTranscription">
            <Trash2 class="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <!-- Audio Player Section -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center space-x-2">
            <Volume2 class="h-5 w-5" />
            <span>Audio Player</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <!-- WaveSurfer Container -->
            <div ref="waveformContainer" class="w-full bg-muted/30 rounded-lg min-h-[120px]"></div>

            <!-- Playback Controls -->
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <Button variant="outline" size="sm" @click="togglePlayback">
                  <Play v-if="!isPlaying" class="h-4 w-4" />
                  <Pause v-else class="h-4 w-4" />
                </Button>

                <span class="text-sm text-muted-foreground">
                  {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
                </span>
              </div>

              <div class="flex items-center space-x-2">
                <Button variant="outline" size="sm" @click="changePlaybackRate(-0.25)" :disabled="playbackRate <= 0.5">
                  <Minus class="h-4 w-4" />
                </Button>
                <span class="text-sm text-muted-foreground min-w-[3rem] text-center">
                  {{ playbackRate }}x
                </span>
                <Button variant="outline" size="sm" @click="changePlaybackRate(0.25)" :disabled="playbackRate >= 2">
                  <Plus class="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Transcription Output -->
      <TranscriptionOutput :transcription="transcription" :current-time="currentTime"
        v-model:word-sync-enabled="wordSyncEnabled" @word-clicked="seekToTime" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import WaveSurfer from 'wavesurfer.js'
import {
  ArrowLeft,
  Calendar,
  Clock,
  HardDrive,
  Volume2,
  Play,
  Pause,
  Plus,
  Minus,
  RefreshCw,
  Trash2,
  Loader2,
  AlertCircle,
} from 'lucide-vue-next'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

import TranscriptionOutput from '@/components/TranscriptionOutput.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { useTranscriptions } from '@/composables/useTranscriptions'
import type { TranscriptionData } from '@/lib/database'

const route = useRoute()
const router = useRouter()

// Composables
const {
  getTranscription,
  retryTranscription: retryTranscriptionStore,
  deleteTranscription: deleteTranscriptionStore,
} = useTranscriptions()

// Local state
const transcription = ref<TranscriptionData | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const waveformContainer = ref<HTMLDivElement>()
const wavesurfer = ref<WaveSurfer | null>(null)
const audioUrl = ref<string | null>(null)
const currentTime = ref(0)
const duration = ref(0)
const isPlaying = ref(false)
const playbackRate = ref(1)
const wordSyncEnabled = ref(true)

// Computed
const transcriptionId = computed(() => route.params.id as string)

// Methods
async function loadTranscription() {
  try {
    loading.value = true
    error.value = null

    const data = await getTranscription(transcriptionId.value)
    if (!data) {
      error.value = 'Transcription not found'
      return
    }

    transcription.value = data

    // Create audio URL from blob and initialize WaveSurfer
    if (data.audioBlob) {
      audioUrl.value = URL.createObjectURL(data.audioBlob)
      await initializeWaveSurfer()
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load transcription'
  } finally {
    loading.value = false
  }
}

async function initializeWaveSurfer() {
  if (!waveformContainer.value || !audioUrl.value) return

  // Destroy existing instance
  if (wavesurfer.value) {
    wavesurfer.value.destroy()
  }
  wavesurfer.value = WaveSurfer.create({
    container: waveformContainer.value,
    waveColor: 'rgb(59, 130, 246)', // blue-500
    progressColor: 'rgb(37, 99, 235)', // blue-600
    cursorColor: 'rgb(239, 68, 68)', // red-500
    barWidth: 2,
    barRadius: 1,
    height: 120,
    normalize: true,
    backend: 'WebAudio',
    mediaControls: false,
    interact: true,
    minPxPerSec: 50, // Lower for faster loading
  })


  console.log("WaveSurfer initialized with audio URL:", audioUrl.value);

  // Set up event listeners
  wavesurfer.value.on('ready', () => {
    duration.value = wavesurfer.value?.getDuration() || 0

    if (wavesurfer.value) {
      wavesurfer.value.setPlaybackRate(playbackRate.value)
    }
  })

  wavesurfer.value.on('audioprocess', () => {
    currentTime.value = wavesurfer.value?.getCurrentTime() || 0
  })
  wavesurfer.value.on('interaction', () => {
    currentTime.value = wavesurfer.value?.getCurrentTime() || 0
  })

  wavesurfer.value.on('play', () => {
    isPlaying.value = true
  })

  wavesurfer.value.on('pause', () => {
    isPlaying.value = false
  })

  wavesurfer.value.on('finish', () => {
    isPlaying.value = false
    currentTime.value = 0
  })

  // Load audio
  await wavesurfer.value.load(audioUrl.value)
}

function togglePlayback() {
  if (!wavesurfer.value) return

  if (wavesurfer.value.isPlaying()) {
    wavesurfer.value.pause()
  } else {
    wavesurfer.value.play()
  }
}

function seekToTime(time: number) {
  if (!wavesurfer.value) return

  const progress = time / (duration.value || 1)
  console.log("Seeking to time:", time, "Progress:", progress, "Duration:", duration.value);

  wavesurfer.value.seekTo(progress)
  currentTime.value = time
}

function changePlaybackRate(delta: number) {
  playbackRate.value = Math.max(0.5, Math.min(2, playbackRate.value + delta))
  if (wavesurfer.value) {
    wavesurfer.value.setPlaybackRate(playbackRate.value)
  }
}

function goBack() {
  console.log("Going back to previous route", window.history);

  // Check if there's history to go back to
  if (window.history.length > 2) {
    router.back()
  } else {
    // No history, navigate to home
    router.push({ name: 'home' })
  }
}

async function retryTranscription() {
  if (!transcription.value) return

  try {
    // Get API key from storage or prompt user
    const apiKey = '' // This should be retrieved from storage or user input
    await retryTranscriptionStore(transcription.value.id, apiKey)
    await loadTranscription() // Reload to get updated status
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to retry transcription'
  }
}

async function deleteTranscription() {
  if (!transcription.value) return

  if (confirm('Are you sure you want to delete this transcription?')) {
    try {
      await deleteTranscriptionStore(transcription.value.id)
      router.push({ name: 'home' })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete transcription'
    }
  }
}

// Utility functions
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

function formatTime(seconds: number): string {
  if (isNaN(seconds)) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

function formatFileSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 B'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
}

function getStatusVariant(status: TranscriptionData['status']) {
  switch (status) {
    case 'completed':
      return 'default'
    case 'processing':
      return 'secondary'
    case 'error':
      return 'destructive'
    default:
      return 'outline'
  }
}

function getStatusText(status: TranscriptionData['status']) {
  switch (status) {
    case 'completed':
      return 'Completed'
    case 'processing':
      return 'Processing'
    case 'error':
      return 'Error'
    case 'pending':
      return 'Pending'
    default:
      return 'Unknown'
  }
}

// Watch for route changes
watch(
  () => route.params.id,
  (newId) => {
    if (newId) {
      loadTranscription()
    }
  },
  { immediate: true },
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

onMounted(() => {
  loadTranscription()
})
</script>
