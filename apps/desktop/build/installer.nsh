; NSIS Custom Installer Script for EduClass v2
; Tự động thêm và gỡ bỏ quy tắc tường lửa Windows Firewall cho cổng máy chủ 3000 (D1 PLAN.md)

!macro customInstall
  DetailPrint "Đang cấu hình Windows Firewall cho EduClass Server..."
  ; Thêm quy tắc cho phép kết nối đến cổng TCP 3000
  ExecWait 'netsh advfirewall firewall add rule name="EduClass Server" dir=in action=allow protocol=TCP localport=3000 profile=any'
!macroend

!macro customUnInstall
  DetailPrint "Đang dọn dẹp quy tắc Windows Firewall..."
  ; Xóa quy tắc tường lửa khi gỡ cài đặt phần mềm
  ExecWait 'netsh advfirewall firewall delete rule name="EduClass Server"'
!macroend
