export interface User {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
}

export interface ScanJob {
  id: string
  status: 'pending' | 'running' | 'done' | 'error'
  phase: string | null
  total: number
  processed: number
  started_at: string | null
  finished_at: string | null
  error: string | null
}

export interface AnalysisSummary {
  exact_duplicates: number
  near_duplicates: number
  bursts: number
  blurry: number
  bad_exposure: number
  screenshots: number
  deletion_queue: number
}

export interface Photo {
  id: string
  google_id: string
  filename: string | null
  creation_time: string | null
  width: number | null
  height: number | null
  base_url: string | null
  blur_score: number | null
  exposure_score: number | null
  is_screenshot: boolean
}

export interface AnalysisGroup {
  id: string
  group_type: string
  similarity: number | null
  photos: Photo[]
}

export interface DeletionQueueItem {
  id: string
  photo: Photo
  reason: string | null
  added_at: string
}
