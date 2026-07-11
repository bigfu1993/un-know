import type { ClientOrder } from "@unknown/domain";

/** 订单模块卡片展示的业务分类统计。 */
export interface OrderModuleCounts {
  featured: number;
  partTime: number;
  delegation: number;
  hunting: number;
}

type OrderModuleKey = keyof OrderModuleCounts;

/** 当前订单接口未返回业务类型字段时，用标题、详情和状态做前端展示归类。 */
const orderModuleKeywords: Array<{ key: OrderModuleKey; keywords: string[] }> = [
  { key: "partTime", keywords: ["兼职", "报名", "招募", "签到", "结算"] },
  { key: "delegation", keywords: ["委托", "发布方", "服务发布", "报价发布", "跑腿", "取件", "代买"] },
  { key: "hunting", keywords: ["狩猎", "服务方", "接单", "领取", "接受委托", "报价委托"] }
];

/** 聚合订单卡片所需的四类数量，无法识别类型时默认归入优选订单。 */
export function getOrderModuleCounts(orders: ClientOrder[]): OrderModuleCounts {
  return orders.reduce<OrderModuleCounts>(
    (counts, order) => {
      const searchText = `${order.title} ${order.detail} ${order.status}`;
      const matchedRule = orderModuleKeywords.find((rule) =>
        rule.keywords.some((keyword) => searchText.includes(keyword))
      );
      const moduleKey = matchedRule?.key ?? "featured";

      return {
        ...counts,
        [moduleKey]: counts[moduleKey] + 1
      };
    },
    {
      featured: 0,
      partTime: 0,
      delegation: 0,
      hunting: 0
    }
  );
}
