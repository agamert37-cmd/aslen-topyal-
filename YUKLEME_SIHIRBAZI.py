import os
import sys
import subprocess
import shutil
import threading
import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import urllib.request
import json

class ModernInstaller(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Sistem Yükleme ve Derleme Sihirbazı v2.0")
        self.geometry("750x550")
        self.configure(bg="#1e1e2e")
        self.style = ttk.Style(self)
        self.style.theme_use('clam')
        
        # Tema Ayarları
        self.style.configure("TFrame", background="#1e1e2e")
        self.style.configure("TLabel", background="#1e1e2e", foreground="#cdd6f4", font=("Segoe UI", 10))
        self.style.configure("Title.TLabel", font=("Segoe UI", 16, "bold"), foreground="#89b4fa")
        self.style.configure("TButton", background="#89b4fa", foreground="#1e1e2e", font=("Segoe UI", 10, "bold"), padding=5)
        self.style.map("TButton", background=[("active", "#b4befe")])
        self.style.configure("TProgressbar", thickness=20, bordercolor="#1e1e2e", background="#a6e3a1")

        # Ana Konteyner
        main_frame = ttk.Frame(self)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=30, pady=30)

        # Başlık ve Açıklama
        ttk.Label(main_frame, text="Sistem ve Karargah Kurulum Sihirbazı", style="Title.TLabel").pack(anchor=tk.W, pady=(0, 10))
        desc = "Bu sihirbaz, kaynak kodları GitHub'dan çekecek, NodeJS ve Git gereksinimlerini kontrol edecek, ve ardından Karargah Uygulaması ile Ana Sistemin (Web) masaüstü .exe versiyonlarını derleyerek masaüstünüze kısayol/dosya bırakacaktır."
        ttk.Label(main_frame, text=desc, wraplength=690).pack(anchor=tk.W, pady=(0, 20))

        # Kontrol Paneli
        req_frame = ttk.Frame(main_frame)
        req_frame.pack(fill=tk.X, pady=10)
        
        ttk.Label(req_frame, text="Sistem Gereksinimleri:", font=("Segoe UI", 11, "bold")).grid(row=0, column=0, sticky=tk.W, pady=5)
        
        self.lbl_node = ttk.Label(req_frame, text="⏳ Node.js (npm) Kontrol Ediliyor...")
        self.lbl_node.grid(row=1, column=0, sticky=tk.W, pady=2)
        
        self.lbl_git = ttk.Label(req_frame, text="⏳ Git Kontrol Ediliyor...")
        self.lbl_git.grid(row=2, column=0, sticky=tk.W, pady=2)

        # URL Giriş
        url_frame = ttk.Frame(main_frame)
        url_frame.pack(fill=tk.X, pady=10)
        
        # Seçenekler: Yeni Kurulum veya Güncelleme
        self.action_var = tk.StringVar(value="Yeni Kurulum")
        action_frame = ttk.Frame(url_frame)
        action_frame.pack(fill=tk.X, pady=(0, 10))
        ttk.Radiobutton(action_frame, text="Sıfırdan Yeni Kurulum Yap", variable=self.action_var, value="Yeni Kurulum", command=self.update_ui_state).pack(side=tk.LEFT, padx=(0, 20))
        ttk.Radiobutton(action_frame, text="Mevcut Kurulumu Güncelle", variable=self.action_var, value="Güncelleme", command=self.update_ui_state).pack(side=tk.LEFT)

        self.lbl_repo_or_dir = ttk.Label(url_frame, text="Proje GitHub URL (Token içeren URL kullanılabilir):")
        self.lbl_repo_or_dir.pack(anchor=tk.W, pady=2)
        
        # URL Giriş alanı (Yeni Kurulum için)
        self.repo_var = tk.StringVar(value="") 
        self.entry_repo = ttk.Entry(url_frame, textvariable=self.repo_var, width=80, font=("Consolas", 10))
        self.entry_repo.pack(fill=tk.X, pady=5)
        
        # Klasör Seçimi (Güncelleme için)
        self.dir_var = tk.StringVar()
        self.combo_dirs = ttk.Combobox(url_frame, textvariable=self.dir_var, width=77, state="readonly")
        self.combo_dirs.pack(fill=tk.X, pady=5)
        self.combo_dirs.pack_forget() # Başlangıçta gizli

        # Log Çıktısı
        self.log_area = scrolledtext.ScrolledText(main_frame, height=10, bg="#181825", fg="#a6e3a1", font=("Consolas", 9), borderwidth=0)
        self.log_area.pack(fill=tk.BOTH, expand=True, pady=10)

        # İlerleme Çubuğu ve Buton
        bottom_frame = ttk.Frame(main_frame)
        bottom_frame.pack(fill=tk.X, pady=10)
        
        self.progress = ttk.Progressbar(bottom_frame, orient=tk.HORIZONTAL, mode='determinate')
        self.progress.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 15))
        
        self.btn_start = ttk.Button(bottom_frame, text="Sistemi Kur ve Derle", command=self.start_thread, state=tk.DISABLED)
        self.btn_start.pack(side=tk.RIGHT)

        # Başlangıç Kontrolleri
        self.check_requirements()
        self.update_ui_state()

    def get_existing_projects(self):
        base_dir1 = "C:\\Proje"
        base_dir2 = os.path.join(os.path.expanduser("~"), "Desktop", "Proje")
        
        dirs = []
        for bd in (base_dir1, base_dir2):
            if os.path.exists(bd):
                for d in os.listdir(bd):
                    full_path = os.path.join(bd, d)
                    if os.path.isdir(full_path):
                        # Klasörün git reposu olup olmadığını da kontrol edebiliriz ama basitçe klasörleri alalım
                        if os.path.exists(os.path.join(full_path, ".git")):
                            dirs.append(full_path)
        return dirs

    def update_ui_state(self):
        action = self.action_var.get()
        if action == "Yeni Kurulum":
            self.lbl_repo_or_dir.config(text="Proje GitHub URL (Token içeren URL kullanılabilir):")
            self.combo_dirs.pack_forget()
            self.entry_repo.pack(fill=tk.X, pady=5)
            self.btn_start.config(text="Sistemi Kur ve Derle")
        else:
            self.lbl_repo_or_dir.config(text="Hangi Mevcut Kurulumu Güncelleyelim?")
            self.entry_repo.pack_forget()
            self.combo_dirs.pack(fill=tk.X, pady=5)
            self.btn_start.config(text="Güncelle ve Derle")
            
            # Mevcutları Listele
            dirs = self.get_existing_projects()
            self.combo_dirs['values'] = dirs
            if dirs:
                self.combo_dirs.current(0)
            else:
                self.combo_dirs.set("Mevcut bir proje bulunamadı!")

    def log(self, message):
        def _log():
            self.log_area.insert(tk.END, f"> {message}\n")
            self.log_area.see(tk.END)
            self.update_idletasks()
        self.after(0, _log)

    def set_gui_state(self, widget, state):
        self.after(0, lambda: widget.config(state=state))

    def set_progress(self, value):
        self.after(0, lambda: self.progress.config(value=value))

    def check_requirements(self):
        self.log("Gereksinimler kontrol ediliyor...")
        
        node_ok = self.run_silent_cmd("node -v")
        git_ok = self.run_silent_cmd("git --version")

        if node_ok:
            self.lbl_node.config(text="✅ Node.js ve NPM Yüklü", foreground="#a6e3a1")
        else:
            self.lbl_node.config(text="❌ Node.js Bulunamadı. Lütfen Node.js indirip kurun.", foreground="#f38ba8")
        
        if git_ok:
            self.lbl_git.config(text="✅ Git Yüklü", foreground="#a6e3a1")
        else:
            self.lbl_git.config(text="❌ Git Bulunamadı. Lütfen Git indirip kurun.", foreground="#f38ba8")

        if node_ok and git_ok:
            self.btn_start.config(state=tk.NORMAL)
            self.log("Sistem gereksinimleri karşılanıyor. Kuruluma başlayabilirsiniz.")
        else:
            self.log("HATA: Gerekli yazılımlar eksik. Kurulum başlatılamaz.")

    def run_silent_cmd(self, cmd):
        try:
            subprocess.run(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            return True
        except:
            return False

    def stream_command(self, cmd, cwd=None):
        try:
            env = os.environ.copy()
            env["GIT_TERMINAL_PROMPT"] = "0" # Gizli repolarda prompt açıp asılı kalmasını önler
            env["CI"] = "true" # NPM gibi araçların etkileşimli modda kalmasını önler

            process = subprocess.Popen(
                cmd, 
                cwd=cwd, 
                shell=True, 
                stdout=subprocess.PIPE, 
                stderr=subprocess.STDOUT, 
                text=True, 
                encoding='utf-8', 
                errors='replace',
                env=env
            )
            
            for line in iter(process.stdout.readline, ''):
                if line:
                    self.log(line.strip())
            
            process.stdout.close()
            process.wait()
            
            return process.returncode == 0
        except Exception as e:
            self.log(f"Komut Hatası ({cmd}): {e}")
            return False

    def start_thread(self):
        action = self.action_var.get()
        if action == "Yeni Kurulum":
            repo_url = self.repo_var.get().strip()
            if not repo_url:
                messagebox.showwarning("Eksik Bilgi", "Lütfen projenin GitHub URL'sini girin.")
                return
            target_dir = None
        else:
            repo_url = None
            target_dir = self.dir_var.get().strip()
            if not target_dir or target_dir == "Mevcut bir proje bulunamadı!":
                messagebox.showwarning("Eksik Bilgi", "Lütfen güncellenecek mevcut kurulumu seçin.")
                return
            if not os.path.isdir(target_dir):
                messagebox.showwarning("Hata", "Seçilen dizin geçersiz!")
                return
            
        self.set_gui_state(self.btn_start, tk.DISABLED)
        self.set_gui_state(self.entry_repo, tk.DISABLED)
        self.set_gui_state(self.combo_dirs, tk.DISABLED)
        self.set_progress(0)
        
        thread = threading.Thread(target=self.install_process, args=(action, repo_url, target_dir))
        thread.daemon = True
        thread.start()

    def install_process(self, action, repo_url, target_dir):
        desktop_path = os.path.join(os.path.expanduser("~"), "Desktop")
        
        if action == "Yeni Kurulum":
            # C:\Proje veya Desktop\Proje klasörünü oluştur
            base_dir = "C:\\Proje"
            try:
                os.makedirs(base_dir, exist_ok=True)
            except Exception:
                # C diskine yazma izni yoksa masaüstüne kur
                base_dir = os.path.join(os.path.expanduser("~"), "Desktop", "Proje")
                os.makedirs(base_dir, exist_ok=True)
    
            # 1. Site, 2. Site ... klasör ismini belirle
            site_index = 1
            while True:
                work_dir = os.path.join(base_dir, f"{site_index}. Site")
                if not os.path.exists(work_dir):
                    break
                # Eğer klasör varsa ama içi boşsa onu kullan
                if os.path.isdir(work_dir) and not os.listdir(work_dir):
                    break
                site_index += 1
                
            os.makedirs(work_dir, exist_ok=True)
            
            self.log("------------------------------------------")
            self.log(f"Çalışma Dizini: {work_dir}")
            self.log("Adım 1/5: Kaynak kodları indiriliyor (Yeni Kurulum)...")
            self.set_progress(10)
            
            if not self.stream_command(f"git clone {repo_url} \"{work_dir}\""):
                self.log("HATA: Git Clone başarısız oldu. URL'yi kontrol edin veya erişim yetkinizi (Token) doğrulayın.")
                self.set_gui_state(self.btn_start, tk.NORMAL)
                self.set_gui_state(self.entry_repo, tk.NORMAL)
                self.set_gui_state(self.combo_dirs, tk.NORMAL)
                return
        else:
            # Güncelleme İşlemi (git pull)
            work_dir = target_dir
            self.log("------------------------------------------")
            self.log(f"Çalışma Dizini: {work_dir}")
            self.log("Adım 1/5: Kaynak kodları güncelleniyor (Git Pull)...")
            self.set_progress(10)
            
            self.stream_command("git checkout package-lock.json", cwd=work_dir) # Olası çakışmaları önler
            self.stream_command("git checkout package.json", cwd=work_dir)
            
            if not self.stream_command("git pull", cwd=work_dir):
                self.log("HATA: Git Pull başarısız oldu. Manuel kontrol gerekebilir.")
                self.set_gui_state(self.btn_start, tk.NORMAL)
                self.set_gui_state(self.entry_repo, tk.NORMAL)
                self.set_gui_state(self.combo_dirs, tk.NORMAL)
                return
            
        self.set_progress(30)

        
        # NPM Command with CMD wrapper for Windows
        npm_cmd = "npm.cmd" if os.name == 'nt' else "npm"
        npx_cmd = "npx.cmd" if os.name == 'nt' else "npx"

        self.log("------------------------------------------")
        self.log("Adım 2/5: NPM Paketleri yükleniyor (Bu işlem internet hızınıza bağlı olarak zaman alabilir)...")
        if not self.stream_command(f"{npm_cmd} install --no-fund --no-audit --loglevel=error --legacy-peer-deps", cwd=work_dir):
            self.log("HATA: NPM paketleri yüklenemedi.")
            self.set_gui_state(self.btn_start, tk.NORMAL)
            self.set_gui_state(self.entry_repo, tk.NORMAL)
            self.set_gui_state(self.combo_dirs, tk.NORMAL)
            return
            
        self.set_progress(60)
        
        self.log("------------------------------------------")
        self.log("Adım 3/5: Proje Ön Derlemesi Yapılıyor (Web Frontend)...")
        self.stream_command(f"{npm_cmd} run build", cwd=work_dir)
        
        self.set_progress(75)
        self.log("------------------------------------------")
        self.log("Adım 4/5: Karargah ve Site İçin 2 Ayrı EXE Derleniyor...")
        
        self.log("1. Karargah (Yönetim Paneli) EXE dosyası oluşturuluyor...")
        build_k = self.stream_command(f'{npx_cmd} electron-builder --win portable -c.productName="Karargah_Yonetim"', cwd=work_dir)
        if not build_k:
            self.log("UYARI: İlk electron-builder denemesi hata verdi. Yerel (lokal) paketten deneniyor...")
            self.stream_command(f"{npm_cmd} install electron-builder --save-dev --legacy-peer-deps", cwd=work_dir)
            self.stream_command(f'{npx_cmd} electron-builder --win portable -c.productName="Karargah_Yonetim"', cwd=work_dir)
            
        self.set_progress(85)
        
        self.log("2. Sitenin Kendisi (Kullanıcı Arayüzü) EXE dosyası oluşturuluyor...")
        self.stream_command(f'{npx_cmd} electron-builder --win portable -c.productName="Sistem_Site_Erisimi"', cwd=work_dir)

        self.set_progress(90)
        
        self.log("------------------------------------------")
        self.log("Adım 5/5: Her İki Uygulamanın Masaüstüne Kopyalanması...")
        
        dist_path = os.path.join(work_dir, "dist-electron")
        if not os.path.exists(dist_path):
             dist_path = os.path.join(work_dir, "dist")
             
        exe_copied = 0
        if os.path.exists(dist_path):
            for file in os.listdir(dist_path):
                # .exe olanları al (Ancak "Setup" olan installer ise atla, portable direkt exe verir)
                if file.endswith(".exe") and "Setup" not in file:
                    source_file = os.path.join(dist_path, file)
                    target_file = os.path.join(desktop_path, file)
                    try:
                        shutil.copy2(source_file, target_file)
                        self.log(f"BAŞARILI: '{file}' masaüstüne kopyalandı!")
                        exe_copied += 1
                    except Exception as e:
                        self.log(f"Kopyalama Hatası: {e}")
                        
        if exe_copied < 2:
             self.log(f"İstenilen 2 exe'nin hepsi taşınamamış olabilir (Kopyalanan: {exe_copied}). Lütfen 'dist-electron' klasörünü kontrol edin.")
             
        self.set_progress(100)
        self.log("------------------------------------------")
        self.log("KURULUM TAMAMLANDI! 🎉")
        self.log("Hem 'Karargah_Yonetim' hem de 'Sistem_Site' masaüstünüze eklendi.")
        
        # Messagebox shouldn't be called directly from worker thread ideally, but we can wrap it or just use `after`.
        if action == "Yeni Kurulum":
             self.after(0, lambda: messagebox.showinfo("Başarılı", "İstediğiniz gibi 2 ayrı EXE oluşturuldu ve Masaüstünüze bırakıldı!"))
        else:
             self.after(0, lambda: messagebox.showinfo("Başarılı", "Uygulamalar güncellendi ve yeni EXE dosyaları Masaüstünüze bırakıldı!"))
        
        self.set_gui_state(self.btn_start, tk.NORMAL)
        self.set_gui_state(self.entry_repo, tk.NORMAL)
        self.set_gui_state(self.combo_dirs, tk.NORMAL)

if __name__ == "__main__":
    app = ModernInstaller()
    app.mainloop()

