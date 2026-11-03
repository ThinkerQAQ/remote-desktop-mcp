package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestNativeSaveRejectsInvalidCredentials(t *testing.T) {
	root := t.TempDir()
	if e := saveNative(root, "not-tunnel", "key"); e == nil {
		t.Fatal("invalid tunnel accepted")
	}
	if e := saveNative(root, "tunnel_test", "bad\nkey"); e == nil {
		t.Fatal("multiline key accepted")
	}
	if e := saveNative(root, "tunnel_test", ""); e == nil {
		t.Fatal("missing key accepted")
	}
}
func TestNativeConfigDoesNotExposeSecretOrRestart(t *testing.T) {
	root := t.TempDir()
	// Save is independent of Node, PowerShell, Bash and any desktop.
	if e := saveNative(root, "tunnel_TEST", "synthetic-not-a-real-key"); e != nil {
		t.Fatal(e)
	}
	for _, name := range []string{"config.toml", "runtime/tunnel.yaml", "runtime/setup.json"} {
		b, e := os.ReadFile(filepath.Join(root, name))
		if e != nil {
			t.Fatal(e)
		}
		if strings.Contains(string(b), "synthetic-not-a-real-key") {
			t.Fatalf("secret leaked into %s", name)
		}
	}
	state, e := readSetup(root)
	if e != nil {
		t.Fatal(e)
	}
	if state.Manager != "go-client" || state.ID != "tunnel_TEST" {
		t.Fatalf("unexpected state: %#v", state)
	}
	raw, e := os.ReadFile(filepath.Join(root, "runtime", "tunnel.yaml"))
	if e != nil {
		t.Fatal(e)
	}
	var decoded map[string]any
	if e = json.Unmarshal(raw, &decoded); e != nil {
		t.Fatal(e)
	}
	if decoded["config_version"].(float64) != 1 {
		t.Fatal("wrong tunnel version")
	}
	if e = saveNative(root, "tunnel_CHANGED", ""); e != nil {
		t.Fatal(e)
	}
	state, _ = readSetup(root)
	if state.ID != "tunnel_CHANGED" {
		t.Fatal("saved config not reused")
	}
	if e = saveNative(root, "tunnel_CHANGED", ""); e != nil {
		t.Fatal(e)
	}
}
