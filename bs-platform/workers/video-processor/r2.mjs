// Minimal R2 (S3-compatible) helpers for the worker: stream a source object to
// disk, and upload the produced HLS tree back. Uses the same @aws-sdk/client-s3
// the app already depends on.

import { createWriteStream } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import { env } from './env.mjs'

const client = new S3Client({
  region: 'auto',
  endpoint: env.r2.endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: env.r2.accessKeyId,
    secretAccessKey: env.r2.secretAccessKey,
  },
  maxAttempts: 4,
})

export async function downloadToFile(key, destPath) {
  const res = await client.send(
    new GetObjectCommand({ Bucket: env.r2.bucket, Key: key })
  )
  if (!res.Body) throw new Error(`R2 object has no body: ${key}`)
  await pipeline(res.Body, createWriteStream(destPath))
}

const CONTENT_TYPES = {
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.ts': 'video/mp2t',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.vtt': 'text/vtt',
  '.mp4': 'video/mp4',
  '.m4s': 'video/iso.segment',
  '.json': 'application/json',
}

export function contentTypeFor(path) {
  const dot = path.lastIndexOf('.')
  const ext = dot >= 0 ? path.slice(dot).toLowerCase() : ''
  return CONTENT_TYPES[ext] || 'application/octet-stream'
}

export async function uploadFile(localPath, key) {
  const body = await readFile(localPath)
  await client.send(
    new PutObjectCommand({
      Bucket: env.r2.bucket,
      Key: key,
      Body: body,
      ContentType: contentTypeFor(key),
    })
  )
}
