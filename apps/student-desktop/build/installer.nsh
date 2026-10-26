; NSIS Custom Installer Script for EduClass Student Client
; Tự động cấu hình tường lửa Windows Firewall cho cổng UDP 54321 và đăng ký tự khởi động cùng Windows

!macro customInstall
  DetailPrint "Đang cấu hình Windows Firewall cho EduClass Student Discovery..."
  ; Thêm quy tắc cho phép nhận gói tin UDP Discovery cổng 54321 (Wake-on-Session)
  ExecWait 'netsh advfirewall firewall add rule name="EduClass Student Discovery" dir=in action=allow protocol=UDP localport=54321 profile=any'

  ; Tự động tạo Shortcut trong Startup để app khởi động cùng Windows ở chế độ nền (--background)
  CreateShortcut "$SMSTARTUP\EduClass Học Sinh.lnk" "$INSTDIR\EduClass Học Sinh.exe" "--background"
!macroend

!macro customUnInstall
  DetailPrint "Đang gỡ bỏ cấu hình EduClass Student..."
  ; Xóa shortcut trong Startup
  Delete "$SMSTARTUP\EduClass Học Sinh.lnk"

  ; Xóa quy tắc tường lửa khi gỡ cài đặt phần mềm
  ExecWait 'netsh advfirewall firewall delete rule name="EduClass Student Discovery"'
!macroend
