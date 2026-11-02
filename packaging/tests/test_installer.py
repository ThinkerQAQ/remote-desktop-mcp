"""Offline installer metadata, target platform and private-data acceptance tests."""
import json
import tempfile
from pathlib import Path
import unittest

from packaging.qt_installer import prepare, check_payload


class InstallerTests(unittest.TestCase):
    def fake_stage(self, root, platform):
        stage = root / "stage"
        (stage / "scripts").mkdir(parents=True)
        (stage / "node_modules" / "lib" / "data").mkdir(parents=True)
        (stage / "bin").mkdir()
        (stage / "package.json").write_text(json.dumps({"version": "0.4.0"}))
        (stage / "LICENSE").write_text("test license")
        (stage / "scripts/proxy.mjs").write_text("// stub")
        (stage / "scripts/setup.mjs").write_text("// stub")
        (stage / "node_modules/lib/data/fixture.json").write_text("{}")
        (stage / "bin" / ("node.exe" if platform == "windows" else "node")).write_text("node")
        (stage / "bin" / ("tunnel-client.exe" if platform == "windows" else "tunnel-client")).write_text("client")
        (stage / ("Configure-RemoteDesktop.ps1" if platform == "windows" else "Configure-RemoteDesktop.sh")).write_text("configure")
        return stage

    def test_qt_tree_all_platforms(self):
        for platform in ("windows", "linux", "darwin"):
            with self.subTest(platform=platform), tempfile.TemporaryDirectory() as d:
                root = Path(d)
                stage = self.fake_stage(root, platform)
                dest = root / "out"
                prepare(stage, dest, "0.4.0", platform)
                self.assertTrue((dest / "config/config.xml").is_file())
                self.assertTrue((dest / "packages/org.thinkerqaq.remotedesktop/meta/configure.ui").is_file())
                script = (dest / "packages/org.thinkerqaq.remotedesktop/meta/installscript.qs").read_text()
                self.assertIn("finishConfigure", script)
                self.assertNotIn("Runtime API key", script)
                self.assertTrue((dest / "packages/org.thinkerqaq.remotedesktop/data/node_modules/lib/data/fixture.json").exists())

    def test_windows_config_shortcut_uses_native_gui(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            stage = self.fake_stage(root, "windows")
            dest = root / "out"
            prepare(stage, dest, "0.4.0", "windows")
            script = (dest / "packages/org.thinkerqaq.remotedesktop/meta/installscript.qs").read_text()
            self.assertIn("-STA", script)
            self.assertIn("-WindowStyle Hidden", script)
            self.assertNotIn("-NoExit", script)

    def test_single_component_and_install_name(self):
        import xml.etree.ElementTree as ET
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            stage = self.fake_stage(root, "windows")
            dest = root / "out"
            prepare(stage, dest, "0.4.0", "windows")
            xml = ET.parse(dest / "config/config.xml")
            self.assertEqual(xml.findtext("./Name"), "RemoteDesktopMCP")
            self.assertEqual(xml.findtext("./TargetDir"), "@HomeDir@/RemoteDesktopMCP")
            self.assertEqual(xml.findtext("./StartMenuDir"), "RemoteDesktopMCP")
            self.assertEqual(xml.findtext("./ControlScript"), "controller.qs")
            controller = (dest / "config/controller.qs").read_text()
            self.assertIn("QInstaller.ComponentSelection, false", controller)
            self.assertIn("QInstaller.StartMenuSelection, false", controller)
            package_script = (dest / "packages/org.thinkerqaq.remotedesktop/meta/installscript.qs").read_text()
            self.assertIn("RemoteDesktopMCP-Maintenance.exe", package_script)

    def test_configuration_links_official_pages(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            stage = self.fake_stage(root, "windows")
            dest = root / "out"
            prepare(stage, dest, "0.4.0", "windows")
            page = (dest / "packages/org.thinkerqaq.remotedesktop/meta/configure.ui").read_text()
            self.assertIn("https://platform.openai.com/settings/organization/tunnels", page)
            self.assertIn("https://platform.openai.com/settings/organization/api-keys", page)
            self.assertIn("<bool>true</bool>", page)

    def test_refuse_runtime_data(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            stage = self.fake_stage(root, "windows")
            (stage / "runtime").mkdir()
            (stage / "runtime/credentials.json").write_text("private")
            with self.assertRaisesRegex(ValueError, "runtime secrets"):
                check_payload(stage, "windows")

    def test_refuse_wrong_version(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            stage = self.fake_stage(root, "windows")
            with self.assertRaisesRegex(ValueError, "Version differs"):
                prepare(stage, root / "out", "0.3.1", "windows")


if __name__ == "__main__":
    unittest.main()
