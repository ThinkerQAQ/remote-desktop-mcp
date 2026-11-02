// Native Windows WinForms configuration UI with embedded RemoteDesktopMCP icon.
// Secrets are never read back from disk or included in command-line arguments.
using System;
using System.ComponentModel;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using System.Windows.Forms;

internal sealed class RemoteDesktopConfigure : Form {
  const string TunnelUrl = "https://platform.openai.com/settings/organization/tunnels";
  const string ApiUrl = "https://platform.openai.com/settings/organization/api-keys";
  const string ChatUrl = "https://chatgpt.com/plugins";
  const string HelpUrl = "https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt";
  const string Mask = "********";
  [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
  static extern int SetCurrentProcessExplicitAppUserModelID(string appID);
  static string Root { get { return Directory.GetParent(Path.GetDirectoryName(typeof(RemoteDesktopConfigure).Assembly.Location)).FullName; } }
  static string Node { get { return Path.Combine(Root,"bin","node.exe"); } }
  static string Script { get { return Path.Combine(Root,"scripts","setup.mjs"); } }
  static string Runtime { get { return Path.Combine(Root,"scripts","runtime.mjs"); } }
  static string Tunnel { get { return Path.Combine(Root,"bin","tunnel-client.exe"); } }
  readonly TextBox id=new TextBox(), key=new TextBox();
  readonly Button go=new Button(), refresh=new Button(), chat=new Button(), service=new Button();
  readonly CheckBox autostart=new CheckBox();
  readonly Label status=new Label(), plugin=new Label(), hint=new Label();
  readonly System.Windows.Forms.Timer poll=new System.Windows.Forms.Timer();
  bool saved, placeholder, busy, checking, syncingAutostart, serviceRunning;
  internal RemoteDesktopConfigure() {
    Text="RemoteDesktopMCP - Configure Tunnel";
    StartPosition=FormStartPosition.CenterScreen;
    ClientSize=new Size(688,525);
    FormBorderStyle=FormBorderStyle.FixedDialog;
    MaximizeBox=false;
    Font=new Font("Segoe UI",9F);
    string icon=Path.Combine(Root,"brand","remotedesktopmcp.ico");
    if(File.Exists(icon)) Icon=new Icon(icon);
    L("Configure RemoteDesktopMCP on this computer",22,16,630,28,true);
    Link("1. Create / manage Tunnel ID",TunnelUrl,22,52,370);
    Link("2. Create runtime API key (new installations)",ApiUrl,22,78,430);
    L("Tunnel ID",22,125,138,26,false);
    id.Location=new Point(167,121);id.Size=new Size(493,28);Controls.Add(id);
    L("Runtime API key",22,173,138,26,false);
    key.Location=new Point(167,169);key.Size=new Size(493,28);
    key.UseSystemPasswordChar=true;
    key.Enter += (s,e)=> {if(placeholder){placeholder=false;key.Clear();}};
    key.Leave += (s,e)=>{if(saved && key.Text.Length==0) SetMask();};
    Controls.Add(key);
    L("An existing key is shown as ********. Leave it unchanged to reuse it.",22,208,633,30,false).ForeColor=Color.DimGray;
    service.Text="Start Service";service.Location=new Point(22,252);service.Size=new Size(174,35);
    service.Enabled=false;service.Click += ServiceClicked;Controls.Add(service);
    refresh.Text="Refresh status";refresh.Location=new Point(207,252);refresh.Size=new Size(138,35);
    refresh.Click += (s,e)=>UpdateStatus();Controls.Add(refresh);
    go.Text="Configure and Start";go.Location=new Point(355,252);go.Size=new Size(305,35);
    go.Click += Configure;Controls.Add(go);
    autostart.Text="Auto-start at Windows sign-in";
    autostart.Location=new Point(22,299);autostart.Size=new Size(390,28);
    autostart.Enabled=false;
    autostart.CheckedChanged += AutostartChanged;
    Controls.Add(autostart);
    status.Text="Local Tunnel: checking...";status.Location=new Point(22,342);status.Size=new Size(630,24);Controls.Add(status);
    plugin.Text="ChatGPT plugin: not verified";plugin.Location=new Point(22,371);plugin.Size=new Size(630,24);Controls.Add(plugin);
    chat.Text="Open ChatGPT Plugins";chat.Location=new Point(22,413);chat.Size=new Size(186,34);
    chat.Click += (s,e)=>Open(ChatUrl);Controls.Add(chat);
    Link("How to register your Tunnel as a plugin",HelpUrl,226,421,427);
    hint.Location=new Point(22,460);hint.Size=new Size(637,40);
    hint.Text="Register your Tunnel in ChatGPT Plugins, then verify its MCP tools.";
    hint.ForeColor=Color.DimGray;Controls.Add(hint);
    Load += (s,e)=>{
      RestoreFields();UpdateStatus();
      poll.Interval=8000;poll.Tick+=(x,y)=>UpdateStatus();poll.Start();
    };
    FormClosing += (s,e)=>{
      if(busy) {e.Cancel=true;MessageBox.Show("Setup is still running.", "RemoteDesktopMCP");}
      else poll.Stop();
    };
  }
  Label L(string text,int x,int y,int w,int h,bool bold) {
    var l=new Label{Text=text,Location=new Point(x,y),Size=new Size(w,h)};
    if(bold)l.Font=new Font(Font,FontStyle.Bold);
    Controls.Add(l);return l;
  }
  void Link(string text,string url,int x,int y,int w) {
    var l=new LinkLabel{Text=text,Location=new Point(x,y),Size=new Size(w,24)};
    l.LinkClicked+=(s,e)=>Open(url);Controls.Add(l);
  }
  void Open(string url) {
    try{Process.Start(new ProcessStartInfo(url){UseShellExecute=true});}
    catch{MessageBox.Show("Open in browser: "+url,"RemoteDesktopMCP");}
  }
  static bool Configured {get{return File.Exists(Path.Combine(Root,"runtime","setup.json"));}}
  static bool HasKey {get{return Configured && File.Exists(Path.Combine(Root,"runtime","credentials.json"));}}
  static string SavedId() {
    try{
      string p=Path.Combine(Root,"runtime","setup.json");
      if(!File.Exists(p))return "";
      Match m=Regex.Match(File.ReadAllText(p),"\"id\"\\s*:\\s*\"(tunnel_[A-Za-z0-9_-]+)\"");
      return m.Success?m.Groups[1].Value:"";
    }catch{return "";}
  }
  void SetMask(){key.Text=Mask;placeholder=true;}
  void RestoreFields(){
    saved=HasKey;
    if(String.IsNullOrWhiteSpace(id.Text))id.Text=SavedId();
    if(saved && !key.Focused && (placeholder || key.Text.Length==0))SetMask();
  }
  sealed class State{internal bool Running,Ready,SupportsAutoStart;internal bool? Autostart;}
  static State ReadState(){
    if(!Configured)return new State();
    var psi=new ProcessStartInfo(Node,"\""+Runtime+"\" status");
    psi.WorkingDirectory=Root;psi.UseShellExecute=false;psi.CreateNoWindow=true;
    psi.RedirectStandardOutput=true;psi.RedirectStandardError=true;
    using(var p=Process.Start(psi)){
      if(p==null)return new State();
      var output=p.StandardOutput.ReadToEndAsync();
      var error=p.StandardError.ReadToEndAsync();
      if(!p.WaitForExit(6500)){p.Kill();return new State();}
      if(p.ExitCode!=0)return new State();
      string json=output.Result;
      return new State{
        Running=Regex.IsMatch(json,"\"managed_process_running\"\\s*:\\s*true"),
        Ready=Regex.IsMatch(json,"\"tunnel_ready\"\\s*:\\s*true"),
        SupportsAutoStart=Regex.IsMatch(json,"\"manager\"\\s*:\\s*\"scheduled-task\""),
        Autostart=Regex.IsMatch(json,"\"autostart_enabled\"\\s*:\\s*true")?true:
          Regex.IsMatch(json,"\"autostart_enabled\"\\s*:\\s*false")?(bool?)false:null
      };
    }
  }
  void UpdateStatus(){
    if(checking||busy||IsDisposed||!IsHandleCreated)return;
    checking=true;
    var work=new BackgroundWorker();
    work.DoWork+=(s,e)=>{e.Result=ReadState();};
    work.RunWorkerCompleted+=(s,e)=>{
      checking=false;work.Dispose();
      if(IsDisposed)return;
      RestoreFields();
      var state=e.Error==null?e.Result as State:null;
      status.Text=state!=null && state.Ready?"Local Tunnel: Connected":
        state!=null && state.Running?"Local Tunnel: starting / not ready":
        Configured?"Local Tunnel: configured, not connected":"Local Tunnel: not configured";
      status.ForeColor=state!=null && state.Ready?Color.DarkGreen:Color.DarkGoldenrod;
      serviceRunning=state!=null && state.Running;
      service.Text=serviceRunning?"Stop Service":"Start Service";
      service.Enabled=Configured && File.Exists(Node) && File.Exists(Runtime) && !busy;
      syncingAutostart=true;
      try {
        autostart.Checked=state!=null && state.Autostart==true;
        autostart.Enabled=Configured && File.Exists(Node) && File.Exists(Runtime) && state!=null && state.SupportsAutoStart && !busy;
      } finally {syncingAutostart=false;}
      plugin.Text="ChatGPT plugin: not verified here (complete registration in ChatGPT)";
    };
    work.RunWorkerAsync();
  }
  void BeginControl(string arguments, Action<bool> finished) {
    if(busy || !Configured || !File.Exists(Node) || !File.Exists(Runtime))return;
    busy=true;go.Enabled=false;refresh.Enabled=false;service.Enabled=false;autostart.Enabled=false;
    var work=new BackgroundWorker();
    work.DoWork+=(s,e)=>{
      var psi=new ProcessStartInfo(Node,"\""+Runtime+"\" "+arguments);
      psi.WorkingDirectory=Root;psi.UseShellExecute=false;psi.CreateNoWindow=true;
      psi.RedirectStandardOutput=true;psi.RedirectStandardError=true;
      using(var p=Process.Start(psi)){
        if(p==null)throw new InvalidOperationException("Could not start service control");
        var output=p.StandardOutput.ReadToEndAsync();
        var errors=p.StandardError.ReadToEndAsync();
        if(!p.WaitForExit(60000)){p.Kill();throw new TimeoutException("Service control timed out");}
        e.Result=p.ExitCode==0;
      }
    };
    work.RunWorkerCompleted+=(s,e)=>{
      busy=false;go.Enabled=true;refresh.Enabled=true;work.Dispose();
      if(IsDisposed)return;
      finished(e.Error==null && e.Result is bool && (bool)e.Result);
      UpdateStatus();
    };
    work.RunWorkerAsync();
  }
  void ServiceClicked(object sender,EventArgs e) {
    var verb=serviceRunning?"stop":"start";
    status.Text="Local Tunnel: "+(serviceRunning?"stopping...":"starting...");
    BeginControl(verb,ok=>{
      if(!ok) {
        status.Text="Local Tunnel: service control failed";
        status.ForeColor=Color.DarkRed;
      }
    });
  }
  void AutostartChanged(object sender,EventArgs e) {
    if(syncingAutostart || busy || !Configured)return;
    bool enabled=autostart.Checked;
    hint.Text="Updating Windows sign-in auto-start...";
    BeginControl("autostart "+(enabled?"enable":"disable"),ok=>{
      if(!ok) {
        syncingAutostart=true;autostart.Checked=!enabled;syncingAutostart=false;
        hint.Text="Could not change Windows auto-start. Check your user task permissions.";
      } else {
        hint.Text=enabled?"Auto-start enabled for Windows sign-in.":"Auto-start disabled. The current Tunnel is not stopped.";
      }
    });
  }
  void Configure(object sender,EventArgs e){
    string tunnelId=id.Text.Trim();
    if(!Regex.IsMatch(tunnelId,"^tunnel_[A-Za-z0-9_-]+$")){
      MessageBox.Show("Enter a valid Tunnel ID.","RemoteDesktopMCP",MessageBoxButtons.OK,MessageBoxIcon.Warning);return;
    }
    bool reuse=saved && placeholder;
    string typed=reuse?"":key.Text;
    if(!reuse && String.IsNullOrWhiteSpace(typed)){
      MessageBox.Show("Enter an API key for this new connection, or reuse an existing saved key.","RemoteDesktopMCP",
        MessageBoxButtons.OK,MessageBoxIcon.Warning);return;
    }
    if(!File.Exists(Node)||!File.Exists(Tunnel)||!File.Exists(Script)){
      MessageBox.Show("Bundled runtime is missing. Repair installation first.","RemoteDesktopMCP",
        MessageBoxButtons.OK,MessageBoxIcon.Error);return;
    }
    var psi=new ProcessStartInfo(Node,"\""+Script+"\" --non-interactive");
    psi.WorkingDirectory=Root;psi.UseShellExecute=false;psi.CreateNoWindow=true;
    psi.RedirectStandardOutput=true;psi.RedirectStandardError=true;
    psi.EnvironmentVariables["DV_TUNNEL_ID"]=tunnelId;
    psi.EnvironmentVariables["DV_TUNNEL_CLIENT"]=Tunnel;
    psi.EnvironmentVariables["PUPPETEER_SKIP_DOWNLOAD"]="true";
    psi.EnvironmentVariables["PATH"]=Path.Combine(Root,"bin")+";"+Environment.GetEnvironmentVariable("PATH");
    if(!reuse)psi.EnvironmentVariables["DV_RUNTIME_API_KEY"]=typed;
    // No secret in argv, logs or status text. Environment is cleared after spawn.
    busy=true;go.Enabled=false;refresh.Enabled=false;service.Enabled=false;autostart.Enabled=false;
    status.Text="Local Tunnel: validating MCP and connecting...";
    status.ForeColor=Color.DarkGoldenrod;
    var work=new BackgroundWorker();
    work.DoWork+=(s,args)=>{
      using(var p=new Process{StartInfo=psi}){
        if(!p.Start())throw new InvalidOperationException("Cannot start bundled runtime");
        psi.EnvironmentVariables.Remove("DV_RUNTIME_API_KEY");
        var output=new StringBuilder();
        p.OutputDataReceived+=(source,line)=>{if(line.Data!=null)lock(output){
          if(output.Length<8192)output.AppendLine(line.Data);
        }};
        p.ErrorDataReceived+=(source,line)=>{}; // Never echo runtime stderr or credentials to UI.
        p.BeginOutputReadLine();p.BeginErrorReadLine();
        if(!p.WaitForExit(150000)){p.Kill();throw new TimeoutException();}
        p.WaitForExit(); // Flush asynchronous event handlers.
        if(p.ExitCode!=0){args.Result=false;return;}
        lock(output){args.Result=Regex.IsMatch(output.ToString(),"\"tunnel_ready\"\\s*:\\s*true");}
      }
    };
    key.Clear();typed=null;
    work.RunWorkerCompleted+=(s,args)=>{
      busy=false;go.Enabled=true;refresh.Enabled=true;work.Dispose();
      if(IsDisposed)return;
      if(args.Error==null && args.Result is bool && (bool)args.Result){
        saved=true;SetMask();status.Text="Local Tunnel: Connected";status.ForeColor=Color.DarkGreen;
        hint.Text="Local Tunnel connected. Click Open ChatGPT, add the Tunnel plugin, then test its tools.";
      }else{
        RestoreFields();status.Text="Local Tunnel: setup failed or not ready";
        status.ForeColor=Color.DarkRed;
        hint.Text="Setup failed. Check Tunnel ID, credentials and local runtime logs.";
      }
      UpdateStatus();
    };
    work.RunWorkerAsync();
  }
  internal bool SelfTest(){
    RestoreFields();
    bool maskSafe = HasKey
      ? placeholder && key.Text == Mask && id.Text == SavedId()
      : key.Text.Length == 0;
    return Icon!=null && key.UseSystemPasswordChar && maskSafe
      && service.Text=="Start Service" && autostart.Text=="Auto-start at Windows sign-in"
      && Process.GetCurrentProcess().ProcessName == "RemoteDesktopMCP-Configure"
      && chat.Text=="Open ChatGPT Plugins" && status.Text.Contains("Tunnel")
      && plugin.Text.Contains("ChatGPT") && go.Text=="Configure and Start";
  }
  [STAThread]
  static int Main(string[] args){
    try{
      Application.EnableVisualStyles();
      Application.SetCompatibleTextRenderingDefault(false);
      SetCurrentProcessExplicitAppUserModelID("ThinkerQAQ.RemoteDesktopMCP.Configure");
      using(var form=new RemoteDesktopConfigure()){
        if(args.Length==1 && args[0]=="--self-test")return form.SelfTest()?0:5;
        Application.Run(form);
      }
      return 0;
    }catch{
      MessageBox.Show("Could not start the RemoteDesktopMCP configuration window.","RemoteDesktopMCP",
        MessageBoxButtons.OK,MessageBoxIcon.Error);
      return 1;
    }
  }
}
