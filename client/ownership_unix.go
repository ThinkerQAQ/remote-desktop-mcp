//go:build !windows

package main

import (
	"os"
	"os/user"
	"strconv"
	"syscall"
)

func preserveExistingOwner(temp string, existing os.FileInfo) error {
	if existing == nil {
		return nil
	}
	stat, ok := existing.Sys().(*syscall.Stat_t)
	if !ok {
		return nil
	}
	// Ordinary user updates already own the new file; avoid privileged chown.
	if stat.Uid == uint32(os.Geteuid()) && stat.Gid == uint32(os.Getegid()) {
		return nil
	}
	return os.Chown(temp, int(stat.Uid), int(stat.Gid))
}
func assignServiceOwner(file, account string) error {
	u, e := user.Lookup(account)
	if e != nil {
		return e
	}
	uid, e := strconv.Atoi(u.Uid)
	if e != nil {
		return e
	}
	gid, e := strconv.Atoi(u.Gid)
	if e != nil {
		return e
	}
	if e = os.Chown(file, uid, gid); e != nil {
		return e
	}
	return os.Chmod(file, 0600)
}
