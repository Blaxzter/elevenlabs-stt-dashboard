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
          <Button variant="ghost" @click="$router.back()" class="mb-4 -ml-4">
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
          <Button
            variant="outline"
            size="sm"
            @click="retryTranscription"
            v-if="transcription.status === 'error'"
          >
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
            <!-- Audio Element -->
            <audio
              ref="audioPlayer"
              :src="audioUrl"
              controls
              class="w-full"
              @timeupdate="handleTimeUpdate"
              @loadedmetadata="handleAudioLoaded"
            />

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
                <Button
                  variant="outline"
                  size="sm"
                  @click="changePlaybackRate(-0.25)"
                  :disabled="playbackRate <= 0.5"
                >
                  <Minus class="h-4 w-4" />
                </Button>
                <span class="text-sm text-muted-foreground min-w-[3rem] text-center">
                  {{ playbackRate }}x
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  @click="changePlaybackRate(0.25)"
                  :disabled="playbackRate >= 2"
                >
                  <Plus class="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Transcription Output -->
      <TranscriptionOutput
        :transcription="transcription"
        :current-time="currentTime"
        v-model:word-sync-enabled="wordSyncEnabled"
        @word-clicked="seekToTime"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
const audioPlayer = ref<HTMLAudioElement>()
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

    // Create audio URL from blob
    if (data.audioBlob) {
      audioUrl.value = URL.createObjectURL(data.audioBlob)
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load transcription'
  } finally {
    loading.value = false
  }
}

function handleTimeUpdate() {
  if (audioPlayer.value) {
    currentTime.value = audioPlayer.value.currentTime
    isPlaying.value = !audioPlayer.value.paused
  }
}

function handleAudioLoaded() {
  if (audioPlayer.value) {
    duration.value = audioPlayer.value.duration
    audioPlayer.value.playbackRate = playbackRate.value
  }
}

function togglePlayback() {
  if (!audioPlayer.value) return

  if (audioPlayer.value.paused) {
    audioPlayer.value.play()
  } else {
    audioPlayer.value.pause()
  }
}

function seekToTime(time: number) {
  if (!audioPlayer.value) return

  audioPlayer.value.currentTime = time
  currentTime.value = time
}

function changePlaybackRate(delta: number) {
  playbackRate.value = Math.max(0.5, Math.min(2, playbackRate.value + delta))
  if (audioPlayer.value) {
    audioPlayer.value.playbackRate = playbackRate.value
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
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }
})

onMounted(() => {
  loadTranscription()
})
</script>
