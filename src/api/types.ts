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
  new_photos: number
  skipped_photos: number
  is_full_scan: boolean
  album_url: string | null
  started_at: string | null
  finished_at: string | null
  error: string | null
}

export interface PreScanInfo {
  scanned: number       // photos with scanned_at set (fully analyzed)
  unanalyzed: number    // photos in DB but not yet analyzed
  last_scan_at: string | null
}

export interface GroupTypeStat {
  total: number
  reviewed: number
}

export interface ScanOverviewLastScan {
  id: string
  finished_at: string | null
  new_photos: number
  skipped_photos: number
  is_full_scan: boolean
  album_url: string | null
}

export interface ScanOverview {
  last_scan: ScanOverviewLastScan | null
  groups: {
    exact_duplicate: GroupTypeStat
    near_duplicate: GroupTypeStat
    burst: GroupTypeStat
  }
  quality: {
    blurry: number
    bad_exposure: number
    screenshots: number
    total: number
  }
  queue_count: number
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
  reviewed_at: string | null
  photos: Photo[]
}

export interface DeletionQueueItem {
  id: string
  photo: Photo
  reason: string | null
  added_at: string
}
