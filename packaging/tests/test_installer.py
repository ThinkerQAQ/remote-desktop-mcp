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
