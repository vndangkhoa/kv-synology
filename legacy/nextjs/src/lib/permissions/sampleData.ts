export const SAMPLE_NAS_ACL_CSV = `Path,Account Type,Account,Account Description,Owner,Permission Type,Inherited,Apply to,Access Control,Permission
/volume1/Finance_Accounting,group,Finance_Managers,Ban Giám Đốc Tài Chính,admin,ACL,FALSE,This folder and files,Allow,Full Control
/volume1/Finance_Accounting,group,Finance_Staff,Nhân viên Kế toán,admin,ACL,FALSE,This folder and files,Allow,Read & Write
/volume1/Finance_Accounting,group,Domain Users,Toàn bộ nhân viên,admin,ACL,FALSE,This folder and files,Allow,Read & Write
/volume1/Finance_Accounting/2026_Tax_Reports,group,Finance_Managers,Ban Giám Đốc Tài Chính,admin,ACL,TRUE,This folder and files,Allow,Full Control
/volume1/Finance_Accounting/2026_Tax_Reports,user,auditor_external,Kiểm toán viên độc lập,admin,ACL,FALSE,This folder and files,Allow,Read
/volume1/Finance_Accounting/2026_Tax_Reports/Confidential,group,Finance_Staff,Nhân viên Kế toán,admin,ACL,FALSE,This folder and files,Deny,Deny
/volume1/Finance_Accounting/2026_Tax_Reports/Confidential,user,cfo_john,Giám Đốc Tài Chính John,admin,ACL,FALSE,This folder and files,Allow,Full Control
/volume1/Finance_Accounting/Payroll,group,HR_Payroll,Chuyên viên Tính lương,admin,ACL,FALSE,This folder and files,Allow,Read & Write
/volume1/Finance_Accounting/Payroll,user,temp_intern,Thực tập sinh kế toán,admin,ACL,FALSE,This folder and files,Allow,Full Control
/volume1/Human_Resources,group,HR_Directors,Trưởng phòng Nhân sự,admin,ACL,FALSE,This folder and files,Allow,Full Control
/volume1/Human_Resources,group,HR_Staff,Nhân viên Nhân sự,admin,ACL,FALSE,This folder and files,Allow,Read & Write
/volume1/Human_Resources/Employee_Profiles,group,HR_Staff,Nhân viên Nhân sự,admin,ACL,TRUE,This folder and files,Allow,Read & Write
/volume1/Human_Resources/Employee_Profiles/Contracts_2026,group,HR_Staff,Nhân viên Nhân sự,admin,ACL,TRUE,This folder and files,Allow,Read & Write
/volume1/Human_Resources/Employee_Profiles/Contracts_2026,user,recruiter_alice,Chuyên viên tuyển dụng,admin,ACL,FALSE,This folder and files,Allow,Read
/volume1/Human_Resources/Disciplinary_Records,group,HR_Directors,Trưởng phòng Nhân sự,admin,ACL,FALSE,This folder and files,Allow,Full Control
/volume1/Human_Resources/Disciplinary_Records,group,HR_Staff,Nhân viên Nhân sự,admin,ACL,FALSE,This folder and files,Deny,Deny
/volume1/Engineering_R&D,group,Engineers_Lead,Trưởng nhóm Kỹ thuật,admin,ACL,FALSE,This folder and files,Allow,Full Control
/volume1/Engineering_R&D,group,Engineers_All,Tất cả Kỹ sư,admin,ACL,FALSE,This folder and files,Allow,Read & Write
/volume1/Engineering_R&D/Core_Algorithms,group,Engineers_Lead,Trưởng nhóm Kỹ thuật,admin,ACL,TRUE,This folder and files,Allow,Full Control
/volume1/Engineering_R&D/Core_Algorithms/Patents_Pending,user,chief_architect,Kiến trúc sư trưởng,admin,ACL,FALSE,This folder and files,Allow,Full Control
/volume1/Engineering_R&D/Firmware_Builds,group,Engineers_All,Tất cả Kỹ sư,admin,ACL,TRUE,This folder and files,Allow,Read & Write
/volume1/Engineering_R&D/Firmware_Builds/Nightly,group,QA_Testers,Đội ngũ Kiểm thử,admin,ACL,FALSE,This folder and files,Allow,Read
/volume1/Sales_Marketing,group,Marketing_Team,Đội ngũ Tiếp thị,admin,ACL,FALSE,This folder and files,Allow,Read & Write
/volume1/Sales_Marketing,group,Sales_Reps,Đại diện Bán hàng,admin,ACL,FALSE,This folder and files,Allow,Read & Write
/volume1/Sales_Marketing/Brand_Assets,group,Everyone,Mọi người trong công ty,admin,ACL,FALSE,This folder and files,Allow,Read
/volume1/Sales_Marketing/Client_Deals_2026,group,Sales_Reps,Đại diện Bán hàng,admin,ACL,TRUE,This folder and files,Allow,Read & Write
/volume1/Sales_Marketing/Client_Deals_2026/Enterprise_VIP,user,sales_vp,Phó Chủ tịch Bán hàng,admin,ACL,FALSE,This folder and files,Allow,Full Control
/volume1/Executive_Board,group,Board_Members,Hội đồng Quản trị,admin,ACL,FALSE,This folder and files,Allow,Full Control
/volume1/Executive_Board/Strategic_M&A,group,Board_Members,Hội đồng Quản trị,admin,ACL,TRUE,This folder and files,Allow,Full Control
/volume1/Executive_Board/Strategic_M&A/Project_Falcon,user,ceo_david,Tổng Giám Đốc David,admin,ACL,FALSE,This folder and files,Allow,Full Control
/volume1/Executive_Board/Strategic_M&A/Project_Falcon,group,Everyone,Mọi người,admin,ACL,FALSE,This folder and files,Deny,Deny
/volume1/IT_Operations,group,Domain Admins,Quản trị viên Hệ thống,admin,ACL,FALSE,This folder and files,Allow,Full Control
/volume1/IT_Operations/Backup_Archives,group,Domain Admins,Quản trị viên Hệ thống,admin,ACL,TRUE,This folder and files,Allow,Full Control
/volume1/IT_Operations/SSL_Certificates,user,sysadmin_bob,Quản trị viên Bob,admin,ACL,FALSE,This folder and files,Allow,Full Control
/volume1/IT_Operations/Network_Topology,group,Domain Admins,Quản trị viên Hệ thống,admin,ACL,TRUE,This folder and files,Allow,Full Control
/volume1/Legal_Compliance,group,Legal_Counsel,Pháp chế Doanh nghiệp,admin,ACL,FALSE,This folder and files,Allow,Full Control
/volume1/Legal_Compliance/Litigation_2026,group,Legal_Counsel,Pháp chế Doanh nghiệp,admin,ACL,TRUE,This folder and files,Allow,Full Control
/volume1/Legal_Compliance/NDAs_Signed,group,Legal_Counsel,Pháp chế Doanh nghiệp,admin,ACL,TRUE,This folder and files,Allow,Read & Write
/volume1/Legal_Compliance/NDAs_Signed,group,Sales_Reps,Đại diện Bán hàng,admin,ACL,FALSE,This folder and files,Allow,Read`;
