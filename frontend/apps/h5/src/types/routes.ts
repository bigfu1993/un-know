/** H5 主模块路由按页面域组织的数据与动作契约。 */
export interface ClientRoutesProps {
  commission: CommissionProps;
  job: {
    dashboard: MerchantDashboard;
    jobs: PartTimeJob[];
    onApplyTutorTrial: (job: TutorTrialJob) => Promise<unknown> | unknown;
    tutorJobs: TutorTrialJob[];
  };
  merchantSales: {
    dashboard: MerchantDashboard;
    merchantProducts: MerchantProduct[];
  };
  role: Role;
  tutor: {
    students: TutorCertifiedStudent[];
  };
}
