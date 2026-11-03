package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/pelletier/go-toml/v2"
)

func TestConnectionSavePreservesDesktopSettings(t *testing.T) {
	root := t.TempDir()
	config := []byte("[mcp]\nfilter_log_notifications = false\n\n[desktop]\ncustom_setting = 'preserve me'\n")
	if err := os.WriteFile(filepath.Join(root, "config.toml"), config, 0600); err != nil {
		t.Fatal(err)
	}
	if err := saveNative(root, "tunnel_DESKTOP", "synthetic-key"); err != nil {
		t.Fatal(err)
	}
	raw, err := os.ReadFile(filepath.Join(root, "config.toml"))
	if err != nil {
		t.Fatal(err)
	}
	var saved map[string]any
	if err := toml.Unmarshal(raw, &saved); err != nil {
		t.Fatal(err)
	}
	if saved["mcp"].(map[string]any)["filter_log_notifications"] != false || saved["desktop"].(map[string]any)["custom_setting"] != "preserve me" {
		t.Fatal("connection save overwrote desktop settings")
	}
	if saved["tunnel"].(map[string]any)["id"] != "tunnel_DESKTOP" {
		t.Fatal("connection was not saved")
	}
	tunnel, err := os.ReadFile(filepath.Join(root, "runtime", "tunnel.yaml"))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(tunnel), "proxy.mjs") || strings.Contains(string(tunnel), "launch.mjs") {
		t.Fatal("tunnel does not launch Desktop Commander's proxy")
	}
}

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
