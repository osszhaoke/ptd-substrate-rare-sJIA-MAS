import AppKit
import WebKit
import Foundation
let args=CommandLine.arguments
let input=FileHandle.standardInput.readDataToEndOfFile()
let configInput=try JSONSerialization.jsonObject(with:input) as! [String:String]
let app=NSApplication.shared
app.setActivationPolicy(.regular)
class Probe:NSObject,WKNavigationDelegate,WKScriptMessageHandler {
 var view:WKWebView!;var window:NSWindow!;var finished=false;var reported=false
 func webView(_ webView:WKWebView,didFinish navigation:WKNavigation!) {
  if finished && configInput["allowReload"] != "yes" {return};finished=true
  window.makeKeyAndOrderFront(nil);app.activate(ignoringOtherApps:true)
  let code=try! String(contentsOfFile:CommandLine.arguments[2],encoding:.utf8)
  let config=String(data:try! JSONSerialization.data(withJSONObject:configInput),encoding:.utf8)!
  webView.evaluateJavaScript("window.__PROBE_INPUT__="+config+";"+code+";undefined"){_,error in if let e=error {self.finish(["ok":false,"error":e.localizedDescription])}}
 }
 func userContentController(_ c:WKUserContentController,didReceive message:WKScriptMessage){
  guard let result=message.body as? [String:Any] else{return}
  if message.name=="result" {finish(result)}
 }
 func finish(_ result:[String:Any]) {
  guard !reported else{return};reported=true
  let data=try! JSONSerialization.data(withJSONObject:result,options:[.prettyPrinted,.sortedKeys]);try! data.write(to:URL(fileURLWithPath:CommandLine.arguments[3]+".json"))
  let cfg=WKSnapshotConfiguration();cfg.rect=view.bounds
  view.takeSnapshot(with:cfg){image,_ in
   if let image=image,let t=image.tiffRepresentation,let rep=NSBitmapImageRep(data:t),let png=rep.representation(using:.png,properties:[:]) {try? png.write(to:URL(fileURLWithPath:CommandLine.arguments[3]+".png"))}
   print(String(data:data,encoding:.utf8)!);exit((result["ok"] as? Bool)==true ? 0:1)
  }
 }
}
let probe=Probe();let cfg=WKWebViewConfiguration();if let profile=configInput["profile"],let identifier=UUID(uuidString:profile) {cfg.websiteDataStore = WKWebsiteDataStore(forIdentifier:identifier)} else {cfg.websiteDataStore = .nonPersistent()};cfg.userContentController.add(probe,name:"result")
let view=WKWebView(frame:NSRect(x:0,y:0,width:Double(configInput["width"] ?? "390")!,height:844),configuration:cfg);probe.view=view;view.navigationDelegate=probe
let win=NSWindow(contentRect:view.frame,styleMask:[.borderless],backing:.buffered,defer:false);win.contentView=view;probe.window=win;win.orderFrontRegardless();app.activate(ignoringOtherApps:true)
view.load(URLRequest(url:URL(string:args[1])!))
DispatchQueue.main.asyncAfter(deadline:.now()+150){probe.finish(["ok":false,"error":"BROWSER_TIMEOUT"])}
app.run()
