//go:build !windows

package app

import "golang.org/x/sys/unix"

// diskSpace reports total/free bytes for the filesystem containing path on
// Unix (macOS/Linux) via statfs.
func diskSpace(path string) (total, free uint64, ok bool) {
	var st unix.Statfs_t
	if err := unix.Statfs(path, &st); err != nil {
		return 0, 0, false
	}
	bsize := uint64(st.Bsize)
	total = st.Blocks * bsize
	free = st.Bavail * bsize
	return total, free, true
}
