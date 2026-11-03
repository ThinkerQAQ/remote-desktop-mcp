using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

internal static class RemoteDesktopMCP_OpenUI {
  [STAThread]
  private static void Main(string[] args) {
    string root = Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, ".."));
    string node = Path.Combine(root, "bin", "node.exe");
    string gui = Path.Combine(root, "scripts", "gui.mjs");
    if (args.Length == 1 && args[0] == "--self-test") {
      Environment.Exit(File.Exists(node) && File.Exists(gui) ? 0 : 1);
      return;
    }
    try {
      if (!File.Exists(node) || !File.Exists(gui)) throw new InvalidOperationException("Installation is incomplete.");
      Process.Start(new ProcessStartInfo {
        FileName = node,
        Arguments = "\"" + gui + "\"",
        WorkingDirectory = root,
        UseShellExecute = false,
        CreateNoWindow = true,
        WindowStyle = ProcessWindowStyle.Hidden
      });
    } catch {
      MessageBox.Show("Could not open RemoteDesktopMCP configuration. Reinstall or repair the application.",
        "RemoteDesktopMCP", MessageBoxButtons.OK, MessageBoxIcon.Error);
    }
  }
}
