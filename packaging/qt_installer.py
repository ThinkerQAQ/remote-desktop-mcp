#!/usr/bin/env python3
"""Package a verified runtime payload as a native Qt Installer Framework offline installer."""
from __future__ import annotations

import argparse
import datetime
import json
import os
from pathlib import Path
import platform
import plistlib
import re
import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET

ASSETS = Path(__file__).resolve().parent / "assets"
PRIVATE_NAMES = {"config.toml", "credentials.json", "setup.json", "tunnel.yaml", "api-token", ".env"}
PRIVATE_PARTS = {"runtime", "data", "backups", ".git"}


def write_xml(path: Path, name: str, content: dict[str, str]) -> None:
    root = ET.Element(name)
    for k, v in content.items():
        ET.SubElement(root, k).text = v
    ET.indent(root)
    ET.ElementTree(root).write(path, encoding="utf-8", xml_declaration=True)


def check_payload(stage: Path, target: str) -> None:
    required = ("package.json", "LICENSE", "node_modules", "scripts/proxy.mjs",
                "scripts/setup.mjs", "bin/node.exe" if target == "windows" else "bin/node",
                "bin/tunnel-client.exe" if target == "windows" else "bin/tunnel-client",
                "bin/RemoteDesktopMCP-Configure.exe" if target == "windows" else "brand/remotedesktopmcp.png",
                "bin/RemoteDesktopMCP-OpenUI.exe" if target == "windows" else "Open-RemoteDesktop.sh",
                "scripts/gui.mjs", "scripts/gui.html", "scripts/gui.css", "scripts/gui.js",
                "RemoteDesktopMCP-Maintenance.exe" if target == "windows" else "brand/remotedesktopmcp.ico",
                "Configure-RemoteDesktop.ps1" if target == "windows" else "Configure-RemoteDesktop.sh")
    for name in required:
        if not (stage / name).exists():
            raise ValueError(f"Missing packaged dependency: {name}")
    for item in stage.rglob("*"):
        if item.is_symlink():
            raise ValueError(f"Unexpected symbolic link in distributable: {item}")
        relative = item.relative_to(stage)
        if (relative.parts[0].lower() in PRIVATE_PARTS or
            (len(relative.parts) == 1 and item.name.lower() in PRIVATE_NAMES)):
            raise ValueError(f"Refusing to package runtime secrets: {item}")


def prepare(stage: Path, work: Path, version: str, target: str) -> None:
    if not re.fullmatch(r"\d+\.\d+\.\d+", version):
        raise ValueError("Invalid semantic version")
    if version != json.loads((stage / "package.json").read_text())["version"]:
        raise ValueError("Version differs from staged package.json")
    check_payload(stage, target)
    config = work / "config"
    meta = work / "packages" / "org.thinkerqaq.remotedesktop" / "meta"
    data = meta.parent / "data"
    config.mkdir(parents=True)
    meta.mkdir(parents=True)
    shutil.copytree(stage, data)
    if target == "darwin":
        # Finder entry point; the app opens the local configuration UI.
        bundle = data / "RemoteDesktopMCP.app" / "Contents"
        executable = bundle / "MacOS" / "RemoteDesktopMCP"
        executable.parent.mkdir(parents=True)
        executable.write_text('#!/bin/bash\nroot="$(cd "$(dirname "$0")/../../.." && pwd)"\nexec "$root/bin/node" "$root/scripts/gui.mjs"\n')
        executable.chmod(0o755)
        info = {"CFBundleExecutable": "RemoteDesktopMCP",
                "CFBundleIdentifier": "org.thinkerqaq.remotedesktop",
                "CFBundleName": "RemoteDesktopMCP",
                "CFBundleDisplayName": "RemoteDesktopMCP",
                "CFBundlePackageType": "APPL", "CFBundleVersion": version,
                "CFBundleShortVersionString": version, "LSUIElement": True}
        with (bundle / "Info.plist").open("wb") as f:
            plistlib.dump(info, f)
    installer_config = {
        "Name": "RemoteDesktopMCP",
        "Version": version,
        "Title": "RemoteDesktopMCP",
        "Publisher": "ThinkerQAQ",
        "StartMenuDir": "RemoteDesktopMCP",
        "TargetDir": "@HomeDir@/RemoteDesktopMCP",
        "RemoveTargetDir": "false",
        "MaintenanceToolName": "RemoteDesktopMCP-Uninstaller",
        "ControlScript": "controller.qs",
        "WizardStyle": "Modern",
        "WizardShowPageList": "false",
    }
    if target == "windows":
        installer_config["RunProgram"] = "@TargetDir@/bin/RemoteDesktopMCP-OpenUI.exe"
        installer_config["RunProgramDescription"] = "Open RemoteDesktopMCP configuration"
    write_xml(config / "config.xml", "Installer", installer_config)
    write_xml(meta / "package.xml", "Package", {
        "DisplayName": "RemoteDesktopMCP",
        "Description": "Desktop Commander MCP with bundled Node.js and OpenAI tunnel-client",
        "Version": version,
        "ReleaseDate": datetime.date.today().isoformat(),
        "Default": "true",
        "Script": "installscript.qs",
    })
    tree = ET.parse(meta / "package.xml")
    user_interfaces = ET.SubElement(tree.getroot(), "UserInterfaces")
    if target != "windows":
        ET.SubElement(user_interfaces, "UserInterface").text = "configure.ui"
    licenses = ET.SubElement(tree.getroot(), "Licenses")
    ET.SubElement(licenses, "License", {"name": "RemoteDesktopMCP (Apache-2.0)", "file": "LICENSE.txt"})
    ET.indent(tree)
    tree.write(meta / "package.xml", encoding="utf-8", xml_declaration=True)
    if target != "windows":
        shutil.copy2(ASSETS / "configure.ui", meta / "configure.ui")
    shutil.copy2(ASSETS / "controller.qs", config / "controller.qs")
    shutil.copy2(stage / "LICENSE", meta / "LICENSE.txt")
    script = """
function Component() {
    if (installer.isInstaller() && !installer.isCommandLineInstance()) {
        installer.installationFinished.connect(this, Component.prototype.showConfigure);
        installer.finishButtonClicked.connect(this, Component.prototype.finishConfigure);
    }
}
Component.prototype.createOperations = function() {
    component.createOperations();
"""
    if target == "windows":
        script = """
function Component() {}
Component.prototype.createOperations = function() {
    component.createOperations();
"""
    if target == "windows":
        script += """
    component.addOperation("Mkdir", "@UserStartMenuProgramsPath@/RemoteDesktopMCP");
    component.addOperation("CreateShortcut",
        "@TargetDir@/bin/RemoteDesktopMCP-OpenUI.exe",
        "@UserStartMenuProgramsPath@/RemoteDesktopMCP/Configure Tunnel.lnk");
    component.addOperation("CreateShortcut",
        "@TargetDir@/RemoteDesktopMCP-Maintenance.exe",
        "@UserStartMenuProgramsPath@/RemoteDesktopMCP/Manage RemoteDesktopMCP.lnk");
    component.addOperation("CreateShortcut",
        "@TargetDir@/RemoteDesktopMCP-Uninstaller.exe",
        "@UserStartMenuProgramsPath@/RemoteDesktopMCP/Uninstall.lnk");
"""
    elif target == "linux":
        # Avoid a dependency on desktop environment-specific menu packages.
        desktop = 'Type=Application\nName=Configure RemoteDesktopMCP\nTerminal=false\nExec=/bin/bash "@TargetDir@/Open-RemoteDesktop.sh"\nIcon=@TargetDir@/brand/remotedesktopmcp.png\nCategories=Development;Utility;'
        script += f'    component.addOperation("CreateDesktopEntry", "remotedesktopmcp.desktop", {json.dumps(desktop)});\n'
    else:
        script += "    // macOS: configuration launcher is provided as a .command file.\n"
    if target == "windows":
        script += "};\n"
    else:
        script += """};
Component.prototype.showConfigure = function() {
    if (installer.isInstaller() && !installer.isCommandLineInstance() &&
        installer.status == QInstaller.Success)
        installer.addWizardPageItem(component, "ConfigureConnection", QInstaller.InstallationFinished);
};
Component.prototype.finishConfigure = function() {
    if (!installer.isInstaller() || installer.isCommandLineInstance() ||
        installer.status != QInstaller.Success) return;
    var form = component.userInterface("ConfigureConnection");
    if (!form || !form.configureNowCheckBox.checked) return;
    var target = installer.value("TargetDir");
"""
    if target == "darwin":
        script += """
    installer.executeDetached("/usr/bin/open",
        ["-a", target + "/RemoteDesktopMCP.app"], target);
"""
        # Finder-run .command launches Terminal, not a hidden daemon.
        launch = data / "Configure-RemoteDesktop.command"
        launch.write_text('#!/bin/bash\nroot="$(cd "$(dirname "$0")" && pwd)"\nexec /bin/bash "$root/Configure-RemoteDesktop.sh"\n')
        launch.chmod(0o755)
    elif target == "linux":
        script += """
    installer.executeDetached("/bin/bash",
        [target + "/Open-RemoteDesktop.sh"], target);
"""
    if target != "windows":
        script += "};\n"
    (meta / "installscript.qs").write_text(script)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--stage", required=True, type=Path)
    parser.add_argument("--platform", choices=("windows", "linux", "darwin"), required=True)
    parser.add_argument("--version", required=True)
    parser.add_argument("--binarycreator", default="binarycreator")
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--prepare-only", action="store_true")
    args = parser.parse_args()
    stage = args.stage.resolve()
    output = args.output.resolve()
    if output.exists():
        parser.error(f"Refusing to overwrite {output}")
    if not args.prepare_only:
        host = {"Windows": "windows", "Linux": "linux", "Darwin": "darwin"}[platform.system()]
        if host != args.platform:
            parser.error("Qt offline installer must be created using the matching native OS")
    output.parent.mkdir(parents=True, exist_ok=True)
    if args.prepare_only:
        prepare(stage, output, args.version, args.platform)
        return
    with tempfile.TemporaryDirectory(prefix="dv-qtifw-") as temp:
        tree = Path(temp)
        prepare(stage, tree, args.version, args.platform)
        # Compression level 1 keeps CI build times predictable for the many
        # small npm files in an otherwise fully self-contained payload.
        command = [args.binarycreator, "--offline-only", "--compression", "1"]
        if args.platform == "windows":
            if __package__:
                from .windows_gui_template import WINDOWS_GUI, gui_template, pe_subsystem
            else:
                from windows_gui_template import WINDOWS_GUI, gui_template, pe_subsystem
            creator = Path(shutil.which(args.binarycreator) or args.binarycreator).resolve()
            base = creator.with_name("installerbase.exe")
            if not base.is_file():
                raise FileNotFoundError(f"Qt IFW installerbase.exe not found next to binarycreator: {creator}")
            template = tree / "installerbase-gui.exe"
            gui_template(base, template)
            command += ["--template", str(template)]
        command += ["-c", str(tree / "config/config.xml"),
                    "-p", str(tree / "packages"), str(output)]
        subprocess.run(command, check=True)
        if args.platform == "windows" and pe_subsystem(output) != WINDOWS_GUI:
            raise ValueError("Generated Qt installer is not a Windows GUI executable")


if __name__ == "__main__":
    main()
