import os
import sys
import subprocess
import shutil
import threading
import urllib.request
import json
import time

try:
    import customtkinter as ctk
except ImportError:
    print("Gerekli arayüz kütüphanesi yükleniyor (customtkinter)...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "customtkinter"])
    import customtkinter as ctk

from tkinter import messagebox

class ModernInstaller(ctk.CTk):
    def __init__(self):
        super().__init__()
        
        # Tema ve Renk Ayarları
        ctk.set_appearance_mode("dark")
        ctk.set_default_color_theme("blue")
        
        self.title("Karargah Sistem Yönetimi v3.0")
        self.geometry("900x680")
        self.minsize(800, 600)

        # Layout yapılandırması
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(2, weight=1)

        # ─── HEADER ───
        self.header_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.header_frame.grid(row=0, column=0, padx=40, pady=(35, 15), sticky="ew")
        
        self.title_label = ctk.CTkLabel(self.header_frame, text="Sistem Yükleme & Güncelleme Sihirbazı", font=ctk.CTkFont(family="Segoe UI", size=26, weight="bold"))
        self.title_label.pack(anchor="w")
        
        self.desc_label = ctk.CTkLabel(self.header_frame, text="Karargah uygulamanızı saniyeler içinde kurun, gelişmiş EXE ile derleyin veya son sürüme yenileyin.", font=ctk.CTkFont(family="Segoe UI", size=13), text_color="gray")
        self.desc_label.pack(anchor="w", pady=(5, 0))

        # ─── AYARLAR (SETTINGS) ───
        self.settings_frame = ctk.CTkFrame(self, corner_radius=15, fg_color="#181825")
        self.settings_frame.grid(row=1, column=0, padx=40, pady=10, sticky="ew")
        self.settings_frame.grid_columnconfigure(1, weight=1)

        # Aksiyon Seçimi
        self.action_var = ctk.StringVar(value="Yeni Kurulum")
        
        self.radio_frame = ctk.CTkFrame(self.settings_frame, fg_color="transparent")
        self.radio_frame.grid(row=0, column=0, columnspan=2, padx=20, pady=(25, 15), sticky="w")
        
        self.rb_install = ctk.CTkRadioButton(self.radio_frame, text="Sıfırdan Yeni Kurulum", variable=self.action_var, value="Yeni Kurulum", command=self.update_ui_state, font=ctk.CTkFont(weight="bold", size=13))
        self.rb_install.pack(side="left", padx=(0, 25))
        
        self.rb_update = ctk.CTkRadioButton(self.radio_frame, text="Mevcut Kurulumu Güncelle", variable=self.action_var, value="Güncelleme", command=self.update_ui_state, font=ctk.CTkFont(weight="bold", size=13))
        self.rb_update.pack(side="left", padx=(0, 25))
        
        self.rb_remove = ctk.CTkRadioButton(self.radio_frame, text="Sistemi Kaldır", variable=self.action_var, value="Kaldır", command=self.update_ui_state, text_color="#f38ba8", hover_color="#f38ba8", font=ctk.CTkFont(weight="bold", size=13))
        self.rb_remove.pack(side="left")

        # Input & Seçimler
        self.lbl_repo = ctk.CTkLabel(self.settings_frame, text="GitHub Depo URL:", font=ctk.CTkFont(weight="bold", size=13), text_color="#cdd6f4")
        self.lbl_repo.grid(row=1, column=0, padx=25, pady=(10, 25), sticky="w")
        
        self.repo_var = ctk.StringVar()
        self.entry_repo = ctk.CTkEntry(self.settings_frame, textvariable=self.repo_var, placeholder_text="https://github.com/kullanici/repo.git", height=40, border_color="#313244", fg_color="#1e1e2e")
        self.entry_repo.grid(row=1, column=1, padx=(0, 25), pady=(10, 25), sticky="ew")

        self.dir_var = ctk.StringVar(value="Mevcut bir proje bulunamadı!")
        self.combo_dirs = ctk.CTkOptionMenu(self.settings_frame, variable=self.dir_var, values=["Mevcut bir proje bulunamadı!"], height=40, fg_color="#1e1e2e", button_color="#313244", button_hover_color="#45475a", dropdown_fg_color="#1e1e2e", dynamic_resizing=False)
        self.combo_dirs.grid(row=1, column=1, padx=(0, 25), pady=(10, 25), sticky="ew")
        self.combo_dirs.grid_remove()

        # ─── GEREKSİNİMLER VE LOG ───
        self.log_frame = ctk.CTkFrame(self, corner_radius=15, fg_color="#11111b")
        self.log_frame.grid(row=2, column=0, padx=40, pady=10, sticky="nsew")
        self.log_frame.grid_rowconfigure(1, weight=1)
        self.log_frame.grid_columnconfigure(0, weight=1)

        self.req_lbl = ctk.CTkLabel(self.log_frame, text="Sistem Gereksinimleri Onaylanıyor...", font=ctk.CTkFont(size=12, weight="bold"), text_color="#bac2de")
        self.req_lbl.grid(row=0, column=0, padx=20, pady=(15, 0), sticky="w")

        self.log_textbox = ctk.CTkTextbox(self.log_frame, fg_color="transparent", text_color="#a6e3a1", font=ctk.CTkFont(family="Consolas", size=13), wrap="word")
        self.log_textbox.grid(row=1, column=0, padx=15, pady=15, sticky="nsew")
        self.log_textbox.configure(state="disabled")

        # ─── FOOTER (PROGRESS & BUTON) ───
        self.footer_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.footer_frame.grid(row=3, column=0, padx=40, pady=(15, 30), sticky="ew")
        self.footer_frame.grid_columnconfigure(0, weight=1)

        self.progress_bar = ctk.CTkProgressBar(self.footer_frame, height=18, corner_radius=10, progress_color="#89b4fa", fg_color="#313244")
        self.progress_bar.grid(row=0, column=0, sticky="ew", padx=(0, 25))
        self.progress_bar.set(0)

        self.btn_action = ctk.CTkButton(self.footer_frame, text="Sistemi Kur & Derle", command=self.start_thread, height=50, width=220, font=ctk.CTkFont(weight="bold", size=15), corner_radius=12)
        self.btn_action.grid(row=0, column=1)

        # İlk Kontroller
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
                        if os.path.exists(os.path.join(full_path, "package.json")):
                            dirs.append(full_path)
        return dirs

    def update_ui_state(self):
        action = self.action_var.get()
        if action == "Yeni Kurulum":
            self.lbl_repo.configure(text="GitHub Depo URL:")
            self.combo_dirs.grid_remove()
            self.entry_repo.grid()
            self.btn_action.configure(text="Sıfırdan Kur & Derle", fg_color="#89b4fa", hover_color="#74c7ec", text_color="#181825")
        elif action == "Güncelleme":
            self.lbl_repo.configure(text="Hedef Uygulama Dizini:")
            self.entry_repo.grid_remove()
            self.combo_dirs.grid()
            dirs = self.get_existing_projects()
            if dirs:
                self.combo_dirs.configure(values=dirs)
                self.dir_var.set(dirs[0])
            else:
                self.combo_dirs.configure(values=["Mevcut bir proje bulunamadı!"])
                self.dir_var.set("Mevcut bir proje bulunamadı!")
            self.btn_action.configure(text="Güncelle & Sistemi Yenile", fg_color="#a6e3a1", hover_color="#94e2d5", text_color="#11111b")
        elif action == "Kaldır":
            self.lbl_repo.configure(text="Kaldırılacak Sistem Dizini:")
            self.entry_repo.grid_remove()
            self.combo_dirs.grid()
            dirs = self.get_existing_projects()
            if dirs:
                self.combo_dirs.configure(values=dirs)
                self.dir_var.set(dirs[0])
            else:
                self.combo_dirs.configure(values=["Mevcut bir proje bulunamadı!"])
                self.dir_var.set("Mevcut bir proje bulunamadı!")
            self.btn_action.configure(text="Sistemi Tamamen Sil", fg_color="#f38ba8", hover_color="#eba0ac", text_color="#11111b")

    def log(self, message):
        self.log_textbox.configure(state="normal")
        self.log_textbox.insert("end", message + "\n")
        self.log_textbox.see("end")
        self.log_textbox.configure(state="disabled")

    def set_progress(self, percent):
        self.progress_bar.set(percent / 100.0)

    def set_gui_state(self, state):
        self.rb_install.configure(state=state)
        self.rb_update.configure(state=state)
        self.rb_remove.configure(state=state)
        self.btn_action.configure(state=state)
        self.entry_repo.configure(state=state)
        self.combo_dirs.configure(state=state)

    def check_requirements(self):
        try:
            subprocess.run(["node", "-v"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            node_ok = True
        except Exception:
            node_ok = False
            
        try:
            subprocess.run(["git", "--version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            git_ok = True
        except Exception:
            git_ok = False
            
        if node_ok and git_ok:
            self.req_lbl.configure(text="Sistem Gereksinimleri Onaylandı (Node.js & Git Mevcut) ✅", text_color="#a6e3a1")
            self.btn_action.configure(state="normal")
        else:
            self.req_lbl.configure(text="Eksik Gereksinimler Var! Node.js VEYA Git sistemde yüklü değil.", text_color="#f38ba8")
            self.log("Lütfen https://nodejs.org ve https://git-scm.com adreslerinden Node ve Git'i indirin.")
            self.btn_action.configure(state="disabled")

    def stream_command(self, cmd, cwd=None):
        try:
            process = subprocess.Popen(
                cmd,
                cwd=cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                shell=True,
                text=True,
                encoding='utf-8',
                errors='replace'
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
                messagebox.showwarning("Eksik Bilgi", "Lütfen işlem yapılacak mevcut kurulumu seçin.")
                return
            if not os.path.isdir(target_dir):
                messagebox.showwarning("Hata", "Seçilen dizin geçersiz!")
                return
            
        if action == "Kaldır":
            if not messagebox.askyesno("Emin misiniz?", f"Seçilen kurulum tamamen silinecek:\n\n{target_dir}\n\nMasaüstündeki ilgili kısayollar da kaldırılacak. Bu işlem geri alınamaz!\nDevam etmek istiyor musunuz?"):
                return
            
        self.set_gui_state("disabled")
        self.set_progress(0)
        
        thread = threading.Thread(target=self.install_process, args=(action, repo_url, target_dir))
        thread.daemon = True
        thread.start()

    def install_process(self, action, repo_url, target_dir):
        desktop_path = os.path.join(os.path.expanduser("~"), "Desktop")
        
        if action == "Kaldır":
            self.log("------------------------------------------")
            self.log(f"Çalışma Dizini Siliniyor: {target_dir}")
            self.set_progress(10)
            
            try:
                def remove_readonly(func, path, excinfo):
                    os.chmod(path, 0o777)
                    func(path)
                shutil.rmtree(target_dir, onerror=remove_readonly)
                self.log(f"BAŞARILI: {target_dir} dizini silindi.")
            except Exception as e:
                self.log(f"HATA: Dizin silinemedi: {e}")
            
            self.set_progress(40)
            self.log("Masaüstündeki ilgili uygulama dosyaları aranıyor...")
            time.sleep(1)
            
            apps_to_remove = ["Karargah_Yonetim", "Sistem_Site_Erisimi"]
            removed_count = 0
            if os.path.exists(desktop_path):
                for file in os.listdir(desktop_path):
                    if file.endswith(".exe"):
                        for app_name in apps_to_remove:
                            if file.startswith(app_name):
                                try:
                                    os.remove(os.path.join(desktop_path, file))
                                    self.log(f"BAŞARILI: Masaüstünden '{file}' kaldırıldı.")
                                    removed_count += 1
                                except Exception as e:
                                    self.log(f"HATA: '{file}' silinemedi (Muhtemelen şu an arka planda çalışıyor).")
                                    
            self.set_progress(100)
            self.log("------------------------------------------")
            self.log("KALDIRMA İŞLEMİ TAMAMLANDI!")
            
            self.after(0, lambda: messagebox.showinfo("Başarılı", "Sistem başarıyla tamamen kaldırıldı!"))
            self.after(0, lambda: self.set_gui_state("normal"))
            self.after(0, self.update_ui_state) 
            return

        if action == "Yeni Kurulum":
            base_dir = "C:\\Proje"
            try:
                os.makedirs(base_dir, exist_ok=True)
            except Exception:
                base_dir = os.path.join(os.path.expanduser("~"), "Desktop", "Proje")
                os.makedirs(base_dir, exist_ok=True)
    
            site_index = 1
            while True:
                work_dir = os.path.join(base_dir, f"{site_index}. Site")
                if not os.path.exists(work_dir):
                    break
                if os.path.isdir(work_dir) and not os.listdir(work_dir):
                    break
                site_index += 1
                
            os.makedirs(work_dir, exist_ok=True)
            
            self.log("------------------------------------------")
            self.log(f"Çalışma Dizini: {work_dir}")
            self.log("Adım 1/5: Kaynak kodları indiriliyor (Yeni Kurulum)...")
            self.set_progress(10)
            
            if not self.stream_command(f"git clone {repo_url} \"{work_dir}\""):
                self.log("HATA: Git Clone başarısız oldu. URL doğrulamasını kontrol edin.")
                self.after(0, lambda: self.set_gui_state("normal"))
                return
        else:
            # Güncelleme İşlemi (git stahs & pull)
            work_dir = target_dir
            self.log("------------------------------------------")
            self.log("Sistemleri güncellenmeye hazırlamak için çalışan paneller kapatılıyor...")
            if os.name == 'nt':
                os.system('taskkill /F /IM "Karargah_Yonetim*.exe" >nul 2>&1')
                os.system('taskkill /F /IM "Sistem_Site_Erisimi*.exe" >nul 2>&1')
            
            self.log(f"Çalışma Dizini: {work_dir}")
            self.log("Adım 1/5: Kaynak kodları güncelleniyor (Sistemden en son hali çekiliyor)...")
            self.set_progress(10)
            
            self.stream_command("git stash", cwd=work_dir)
            self.stream_command("git fetch --all", cwd=work_dir)
            
            if not self.stream_command("git reset --hard origin/main", cwd=work_dir):
                self.log("UYARI: main dalı sıfırlanamadı, origin/master deneniyor...")
                if not self.stream_command("git reset --hard origin/master", cwd=work_dir):
                    self.log("HATA: Git güncel kodu çekerken hata oluştu. İnternet bağlantınızı doğrulayın.")
                    self.after(0, lambda: self.set_gui_state("normal"))
                    return
            
        self.set_progress(30)
        
        npm_cmd = "npm.cmd" if os.name == 'nt' else "npm"
        npx_cmd = "npx.cmd" if os.name == 'nt' else "npx"

        self.log("------------------------------------------")
        self.log("Adım 2/5: Güncel kütüphaneler yükleniyor (hızınıza göre sürebilir)...")
        if not self.stream_command(f"{npm_cmd} install --no-fund --no-audit --loglevel=error --legacy-peer-deps", cwd=work_dir):
            self.log("HATA: NPM paketleri yüklenemedi.")
            self.after(0, lambda: self.set_gui_state("normal"))
            return
            
        self.set_progress(60)
        
        self.log("------------------------------------------")
        self.log("Adım 3/5: Proje Ön Derlemesi Yapılarak Bileşenler Optimize Ediliyor...")
        self.stream_command(f"{npm_cmd} run build", cwd=work_dir)
        
        self.set_progress(75)
        self.log("------------------------------------------")
        self.log("Adım 4/5: Yeni Sürüm Masaüstü Çalıştırılabilir Uygulamaları (EXE) Derleniyor...")
        
        self.log("-> Karargah EXE dosyası derleniyor...")
        build_k = self.stream_command(f'{npx_cmd} electron-builder --win portable -c.productName="Karargah_Yonetim"', cwd=work_dir)
        if not build_k:
            self.log("Yerel paketten derleme deneniyor...")
            self.stream_command(f"{npm_cmd} install electron-builder --save-dev --legacy-peer-deps", cwd=work_dir)
            self.stream_command(f'{npx_cmd} electron-builder --win portable -c.productName="Karargah_Yonetim"', cwd=work_dir)
            
        self.set_progress(85)
        
        self.log("-> Site/Kullanıcı EXE dosyası derleniyor...")
        self.stream_command(f'{npx_cmd} electron-builder --win portable -c.productName="Sistem_Site_Erisimi"', cwd=work_dir)

        self.set_progress(90)
        
        self.log("------------------------------------------")
        self.log("Adım 5/5: Özel Yapılandırmalar ve Kısayolların Masaüstüne Aktarımı...")
        
        dist_path = os.path.join(work_dir, "dist-electron")
        if not os.path.exists(dist_path):
             dist_path = os.path.join(work_dir, "dist")
             
        exe_copied = 0
        first_exe_path = None
        if os.path.exists(dist_path):
            for file in os.listdir(dist_path):
                if file.endswith(".exe") and "Setup" not in file:
                    source_file = os.path.join(dist_path, file)
                    target_file = os.path.join(desktop_path, file)
                    try:
                        shutil.copy2(source_file, target_file)
                        self.log(f"BAŞARILI: YENİ SÜRÜM -> '{file}' masaüstüne yerleştirildi!")
                        exe_copied += 1
                        if "Karargah" in file:
                            first_exe_path = target_file
                    except Exception as e:
                        self.log(f"Kopyalama Hatası: {e}")
                        
        if exe_copied < 2:
             self.log(f"UYARI: Beklenen EXE dosyaları eksik kopyalanmış olabilir (Taşınan: {exe_copied}).")
             
        self.set_progress(100)
        self.log("------------------------------------------")
        self.log("TÜM İŞLEMLER BAŞARIYLA TAMAMLANDI! 🎉")
        
        if action == "Güncelleme":
            self.log("Güncellenmiş sistem yeniden başlatılıyor...")
            if os.name == 'nt' and first_exe_path:
                try:
                    os.startfile(first_exe_path)
                    self.log("Karargah uygulaması başarıyla başlatıldı.")
                except Exception as e:
                    self.log(f"Otomatik başlatma başarısız: {e}")

        if action == "Yeni Kurulum":
             self.after(0, lambda: messagebox.showinfo("Gelişmiş Kurulum Tamamlandı", "Sistem sıfırdan başarıyla kuruldu. Masaüstünüzdeki kısayolları kullanarak giriş yapabilirsiniz!"))
        else:
             self.after(0, lambda: messagebox.showinfo("Sistem Güncellendi", "Sistem başarıyla GitHub üzerinden en güncel versiyona taşındı. Masaüstünüzdeki uygulamalar yenilendi ve Karargah Yönetim uygulamanız yeniden başlatıldı!"))
        
        self.after(0, lambda: self.set_gui_state("normal"))

if __name__ == "__main__":
    app = ModernInstaller()
    app.mainloop()
