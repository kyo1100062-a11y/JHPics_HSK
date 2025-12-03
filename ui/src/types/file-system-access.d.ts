/**
 * File System Access API 타입 정의
 */

interface FileSystemDirectoryHandle {
  kind: 'directory'
  name: string
  queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>
  requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>
  resolve(possibleDescendant: FileSystemHandle): Promise<string[] | null>
  keys(): AsyncIterableIterator<string>
  values(): AsyncIterableIterator<FileSystemDirectoryHandle | FileSystemFileHandle>
  entries(): AsyncIterableIterator<[string, FileSystemDirectoryHandle | FileSystemFileHandle]>
  [Symbol.asyncIterator](): AsyncIterableIterator<[string, FileSystemDirectoryHandle | FileSystemFileHandle]>
}

interface FileSystemFileHandle {
  kind: 'file'
  name: string
  queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>
  requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>
  getFile(): Promise<File>
  createWritable(options?: FileSystemCreateWritableOptions): Promise<FileSystemWritableFileStream>
}

interface FileSystemCreateWritableOptions {
  keepExistingData?: boolean
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: string | BufferSource | Blob): Promise<void>
  seek(position: number): Promise<void>
  truncate(size: number): Promise<void>
}

interface FileSystemHandlePermissionDescriptor {
  mode?: 'read' | 'readwrite'
}

interface Window {
  showDirectoryPicker(options?: DirectoryPickerOptions): Promise<FileSystemDirectoryHandle>
  showOpenFilePicker(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>
  showSaveFilePicker(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>
}

interface DirectoryPickerOptions {
  id?: string
  mode?: 'read' | 'readwrite'
  startIn?: FileSystemHandle | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos'
}

interface OpenFilePickerOptions {
  multiple?: boolean
  excludeAcceptAllOption?: boolean
  types?: FilePickerAcceptType[]
}

interface SaveFilePickerOptions {
  excludeAcceptAllOption?: boolean
  suggestedName?: string
  types?: FilePickerAcceptType[]
}

interface FilePickerAcceptType {
  description?: string
  accept: Record<string, string[]>
}

