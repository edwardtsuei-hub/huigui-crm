"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  DataTable,
  EmptyState,
  SectionCard,
  StatCard,
} from "../system/primitives";
import {
  currentMonth,
  formatAmount,
  listMySalarySlips,
  type SalarySlip,
} from "../../lib/payroll";
import styles from "./MySalarySlips.module.css";

function latestMonth(slips: SalarySlip[]) {
  return slips[0]?.month ?? currentMonth();
}

function totalNet(slips: SalarySlip[]) {
  return slips.reduce((total, slip) => total + slip.netAmount, 0);
}

function DeductionCell({ slip }: { slip: SalarySlip }) {
  return (
    <div className={styles.deductionCell}>
      <span>¥{formatAmount(slip.deductionAmount)}</span>
      {slip.deductionItems?.length ? (
        <small>
          {slip.deductionItems.map((item) => `${item.label} ¥${formatAmount(item.amount)}`).join(" / ")}
        </small>
      ) : null}
    </div>
  );
}

export function MySalarySlips() {
  const searchParams = useSearchParams();
  const [slips, setSlips] = useState<SalarySlip[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [month, setMonth] = useState(searchParams.get("month") || currentMonth());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const queryMonth = searchParams.get("month");
    if (queryMonth) {
      setMonth(queryMonth);
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await listMySalarySlips();
        if (cancelled) {
          return;
        }
        setSlips(response.data);
        setWarnings(response.warnings ?? []);
        if (!searchParams.get("month")) {
          setMonth(latestMonth(response.data));
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "读取薪资条失败");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const visibleSlips = useMemo(
    () => slips.filter((slip) => slip.month === month),
    [month, slips],
  );
  const months = useMemo(
    () => Array.from(new Set(slips.map((slip) => slip.month))),
    [slips],
  );

  return (
    <div className={styles.workspace}>
      {error ? <div className={styles.notice}>{error}</div> : null}
      {warnings.map((warning) => (
        <div className={styles.notice} key={warning}>{warning}</div>
      ))}

      <div className={styles.toolbar}>
        <div className={styles.stats}>
          <StatCard label="当前月份" value={month} />
          <StatCard label="薪资条" value={`${visibleSlips.length} 条`} />
          <StatCard label="实发合计" value={`¥${formatAmount(totalNet(visibleSlips))}`} />
        </div>
        <label className={styles.monthField}>
          <span>月份</span>
          <input
            list="my-salary-months"
            onChange={(event) => setMonth(event.target.value)}
            type="month"
            value={month}
          />
          <datalist id="my-salary-months">
            {months.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>
      </div>

      <SectionCard
        description="这里只显示当前登录账号可查看的薪资条。"
        title="我的薪资条"
      >
        {loading ? <div className="small muted">正在读取薪资条...</div> : null}
        {!loading && visibleSlips.length === 0 ? (
          <EmptyState
            description="如果你刚收到企业微信通知，请确认登录的是企业微信绑定的同一个系统账号。"
            title="当前月份暂无薪资条"
          />
        ) : null}
        {!loading && visibleSlips.length > 0 ? (
          <DataTable>
            <thead>
              <tr>
                <th>月份</th>
                <th>姓名</th>
                <th>应发</th>
                <th>提成</th>
                <th>分润</th>
                <th>个人承担合计</th>
                <th>实发</th>
                <th>发布时间</th>
              </tr>
            </thead>
            <tbody>
              {visibleSlips.map((slip) => (
                <tr key={slip.id}>
                  <td>{slip.month}</td>
                  <td>{slip.teacherName}</td>
                  <td>¥{formatAmount(slip.grossAmount)}</td>
                  <td>¥{formatAmount(slip.commissionAmount)}</td>
                  <td>¥{formatAmount(slip.profitSharingAmount)}</td>
                  <td><DeductionCell slip={slip} /></td>
                  <td className={styles.amount}>¥{formatAmount(slip.netAmount)}</td>
                  <td>{slip.syncedAt ? new Date(slip.syncedAt).toLocaleString("zh-CN") : "-"}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : null}
      </SectionCard>
    </div>
  );
}
