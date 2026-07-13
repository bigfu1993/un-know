/** 营销预留页面，隔离后续活动能力入口。 */
export function Marketing() {
  return (
    <section className="module-stack grid gap-[10px]">
      <SectionHeader countText="预留" eyebrow="后续营销活动统一从这里设置" title="营销" />
      <article className="empty-state grid justify-items-center gap-[10px] p-[24px] text-center">
        <Megaphone size={28} />
        <strong>营销主入口已预留</strong>
        <p>后续承接优惠券、活动价、置顶、套餐、复购提醒、活动数据、费用扣减和审核规则。</p>
      </article>
    </section>
  );
}
