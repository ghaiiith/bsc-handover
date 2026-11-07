//go:build windows

package app

import (
	"syscall"
	"unsafe"
)

// diskSpace reports total/free bytes for the volume containing path on Windows
// via GetDiskFreeSpaceExW (kernel32).
func diskSpace(path string) (total, free uint64, ok bool) {
	kernel32 := syscall.NewLazyDLL("kernel32.dll")
	getDisk := kernel32.NewProc("GetDiskFreeSpaceExW")
	pathPtr, err := syscall.UTF16PtrFromString(path)
	if err != nil {
		return 0, 0, false
	}
	var freeBytes, totalBytes, totalFreeBytes uint64
	r, _, _ := getDisk.Call(
		uintptr(unsafe.Pointer(pathPtr)),
		uintptr(unsafe.Pointer(&freeBytes)),
		uintptr(unsafe.Pointer(&totalBytes)),
		uintptr(unsafe.Pointer(&totalFreeBytes)),
	)
	if r == 0 {
		return 0, 0, false
	}
	return totalBytes, freeBytes, true
}
