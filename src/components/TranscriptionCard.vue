<template>
  <Card class="hover:shadow-md transition-shadow cursor-pointer" @click="$emit('click')">
    <CardHeader class="pb-3">
      <div class="flex items-start justify-between">
        <div class="flex items-center space-x-2">
          <FileAudio class="h-5 w-5 text-primary" />
          <div>
            <CardTitle class="text-base truncate">{{ transcription.filename }}</CardTitle>
            <p class="text-xs text-muted-foreground">
              {{ formatDate(transcription.createdAt) }}
            </p>
          </div>
        </div>

        <div class="flex flex-col items-end space-y-1">
          <Badge :variant="getStatusVariant(transcription.status)" class="text-xs">
            {{ getStatusText(transcription.status) }}
          </Badge>

          <Button
            variant="ghost"
            size="sm"
            @click.stop="$emit('delete')"
            class="h-6 w-6 p-0 opacity-60 hover:opacity-100"
          >
            <Trash2 class="h-3 w-3" />
          </Button>
        </div>
      </div>
    </CardHeader>

    <CardContent class="pt-0">
      <!-- Metadata -->
      <div class="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-3">
        <div class="flex items-center space-x-1">
          <Clock class="h-3 w-3" />
          <span>{{ formatDuration(transcription.duration || 0) }}</span>
        </div>
        <div class="flex items-center space-x-1">
          <HardDrive class="h-3 w-3" />
          <span>{{ formatFileSize(transcription.fileSize) }}</span>
        </div>
        <div v-if="transcription.apiResponse" class="flex items-center space-x-1">
          <Languages class="h-3 w-3" />
          <span>{{ transcription.apiResponse.languageCode }}</span>
        </div>
        <div v-if="transcription.apiResponse" class="flex items-center space-x-1">
          <Type class="h-3 w-3" />
          <span>{{ getWordCount(transcription.apiResponse.words) }} words</span>
        </div>
      </div>

      <!-- Preview Text -->
      <div
        v-if="transcription.status === 'completed' && transcription.apiResponse"
        class="space-y-2"
      >
        <p class="text-xs text-muted-foreground font-medium">Preview</p>
        <p class="text-sm line-clamp-2 leading-relaxed">
          {{ transcription.apiResponse.text }}
        </p>
      </div>

      <!-- Error Message -->
      <div v-else-if="transcription.status === 'error'" class="space-y-2">
        <p class="text-xs text-destructive font-medium">Error</p>
        <p class="text-sm text-destructive line-clamp-2">
          {{ transcription.error || 'Unknown error occurred' }}
        </p>
      </div>

      <!-- Processing -->
      <div v-else-if="transcription.status === 'processing'" class="flex items-center space-x-2">
        <Loader2 class="h-4 w-4 animate-spin text-primary" />
        <p class="text-sm text-muted-foreground">Processing...</p>
      </div>
    </CardContent>

    <!-- Progress Bar for Processing -->
    <div v-if="transcription.status === 'processing'" class="h-1 bg-muted">
      <div class="h-full bg-primary animate-pulse"></div>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { FileAudio, Clock, HardDrive, Languages, Type, Trash2, Loader2 } from 'lucide-vue-next'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { TranscriptionData } from '@/lib/database'

interface TranscriptionCardProps {
  transcription: TranscriptionData
}

interface TranscriptionCardEmits {
  (e: 'click'): void
  (e: 'delete'): void
}

defineProps<TranscriptionCardProps>()
defineEmits<TranscriptionCardEmits>()

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

function formatDate(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const hours = diff / (1000 * 60 * 60)

  if (hours < 1) {
    const minutes = Math.floor(diff / (1000 * 60))
    return `${minutes}m ago`
  } else if (hours < 24) {
    return `${Math.floor(hours)}h ago`
  } else {
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }
}

function formatDuration(seconds: number): string {
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

function getWordCount(words: Array<{ type: string }>): number {
  return words.filter((word) => word.type === 'word').length
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
