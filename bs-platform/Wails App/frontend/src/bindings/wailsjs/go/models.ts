export namespace app {
	
	export class SystemStats {
	    cpuPercent: number;
	    diskTotalGb: number;
	    diskFreeGb: number;
	    diskUsedPct: number;
	    memoryUsedMb: number;
	
	    static createFrom(source: any = {}) {
	        return new SystemStats(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.cpuPercent = source["cpuPercent"];
	        this.diskTotalGb = source["diskTotalGb"];
	        this.diskFreeGb = source["diskFreeGb"];
	        this.diskUsedPct = source["diskUsedPct"];
	        this.memoryUsedMb = source["memoryUsedMb"];
	    }
	}

}

export namespace domain {
	
	export class ActivityEntry {
	    id: string;
	    level: string;
	    message: string;
	    jobId?: string;
	    createdAt: string;
	
	    static createFrom(source: any = {}) {
	        return new ActivityEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.level = source["level"];
	        this.message = source["message"];
	        this.jobId = source["jobId"];
	        this.createdAt = source["createdAt"];
	    }
	}
	export class AppSettings {
	    platformUrl: string;
	    supabaseUrl: string;
	    supabaseAnonKey: string;
	    ffmpegPath: string;
	    ffprobePath: string;
	    tempDir: string;
	    outputDir: string;
	    maxParallelJobs: number;
	    uploadConcurrency: number;
	    ffmpegThreads: number;
	    segmentLength: number;
	    thumbnailInterval: number;
	    cleanupAfterUpload: boolean;
	    rememberSession: boolean;
	
	    static createFrom(source: any = {}) {
	        return new AppSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.platformUrl = source["platformUrl"];
	        this.supabaseUrl = source["supabaseUrl"];
	        this.supabaseAnonKey = source["supabaseAnonKey"];
	        this.ffmpegPath = source["ffmpegPath"];
	        this.ffprobePath = source["ffprobePath"];
	        this.tempDir = source["tempDir"];
	        this.outputDir = source["outputDir"];
	        this.maxParallelJobs = source["maxParallelJobs"];
	        this.uploadConcurrency = source["uploadConcurrency"];
	        this.ffmpegThreads = source["ffmpegThreads"];
	        this.segmentLength = source["segmentLength"];
	        this.thumbnailInterval = source["thumbnailInterval"];
	        this.cleanupAfterUpload = source["cleanupAfterUpload"];
	        this.rememberSession = source["rememberSession"];
	    }
	}
	export class CourseRow {
	    id: string;
	    title: string;
	    titleAr: string;
	    status: string;
	    totalLessons: number;
	    thumbnailUrl?: string;
	
	    static createFrom(source: any = {}) {
	        return new CourseRow(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.title = source["title"];
	        this.titleAr = source["titleAr"];
	        this.status = source["status"];
	        this.totalLessons = source["totalLessons"];
	        this.thumbnailUrl = source["thumbnailUrl"];
	    }
	}
	export class DashboardStats {
	    totalCourses: number;
	    totalLessons: number;
	    videosReady: number;
	    videosProcessing: number;
	    queueWaiting: number;
	    queueActive: number;
	    storageUsedBytes: number;
	
	    static createFrom(source: any = {}) {
	        return new DashboardStats(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.totalCourses = source["totalCourses"];
	        this.totalLessons = source["totalLessons"];
	        this.videosReady = source["videosReady"];
	        this.videosProcessing = source["videosProcessing"];
	        this.queueWaiting = source["queueWaiting"];
	        this.queueActive = source["queueActive"];
	        this.storageUsedBytes = source["storageUsedBytes"];
	    }
	}
	export class DetectResult {
	    ffmpegPath: string;
	    ffprobePath: string;
	    found: boolean;
	
	    static createFrom(source: any = {}) {
	        return new DetectResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ffmpegPath = source["ffmpegPath"];
	        this.ffprobePath = source["ffprobePath"];
	        this.found = source["found"];
	    }
	}
	export class ImportRequest {
	    courseId: string;
	    lessonId: string;
	    courseTitle: string;
	    lessonTitle: string;
	    filePaths: string[];
	
	    static createFrom(source: any = {}) {
	        return new ImportRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.courseId = source["courseId"];
	        this.lessonId = source["lessonId"];
	        this.courseTitle = source["courseTitle"];
	        this.lessonTitle = source["lessonTitle"];
	        this.filePaths = source["filePaths"];
	    }
	}
	export class LessonRow {
	    id: string;
	    courseId: string;
	    sectionId: string;
	    title: string;
	    titleAr: string;
	    durationMinutes: number;
	    videoAssetId?: string;
	    assetStatus?: string;
	    orderIndex: number;
	
	    static createFrom(source: any = {}) {
	        return new LessonRow(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.courseId = source["courseId"];
	        this.sectionId = source["sectionId"];
	        this.title = source["title"];
	        this.titleAr = source["titleAr"];
	        this.durationMinutes = source["durationMinutes"];
	        this.videoAssetId = source["videoAssetId"];
	        this.assetStatus = source["assetStatus"];
	        this.orderIndex = source["orderIndex"];
	    }
	}
	export class VideoProbe {
	    width: number;
	    height: number;
	    resolution: string;
	    fps: number;
	    videoCodec: string;
	    audioCodec: string;
	    durationSeconds: number;
	    bitrate: number;
	    fileSize: number;
	    aspectRatio: string;
	    rotation: number;
	    containerFormat: string;
	
	    static createFrom(source: any = {}) {
	        return new VideoProbe(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.width = source["width"];
	        this.height = source["height"];
	        this.resolution = source["resolution"];
	        this.fps = source["fps"];
	        this.videoCodec = source["videoCodec"];
	        this.audioCodec = source["audioCodec"];
	        this.durationSeconds = source["durationSeconds"];
	        this.bitrate = source["bitrate"];
	        this.fileSize = source["fileSize"];
	        this.aspectRatio = source["aspectRatio"];
	        this.rotation = source["rotation"];
	        this.containerFormat = source["containerFormat"];
	    }
	}
	export class QueueJob {
	    id: string;
	    courseId: string;
	    courseTitle: string;
	    lessonId: string;
	    lessonTitle: string;
	    sourcePath: string;
	    status: string;
	    progress: number;
	    message: string;
	    probe?: VideoProbe;
	    sourceAssetId?: string;
	    error?: string;
	    createdAt: string;
	    updatedAt: string;
	    position: number;
	
	    static createFrom(source: any = {}) {
	        return new QueueJob(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.courseId = source["courseId"];
	        this.courseTitle = source["courseTitle"];
	        this.lessonId = source["lessonId"];
	        this.lessonTitle = source["lessonTitle"];
	        this.sourcePath = source["sourcePath"];
	        this.status = source["status"];
	        this.progress = source["progress"];
	        this.message = source["message"];
	        this.probe = this.convertValues(source["probe"], VideoProbe);
	        this.sourceAssetId = source["sourceAssetId"];
	        this.error = source["error"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	        this.position = source["position"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class SessionInfo {
	    userId: string;
	    email: string;
	    fullName: string;
	    expiresAt: number;
	
	    static createFrom(source: any = {}) {
	        return new SessionInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.userId = source["userId"];
	        this.email = source["email"];
	        this.fullName = source["fullName"];
	        this.expiresAt = source["expiresAt"];
	    }
	}

}

