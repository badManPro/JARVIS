import { useEffect, useState } from 'react';
import { CheckCircle2, LoaderCircle } from 'lucide-react';
import { Badge, Card, Muted, SectionTitle } from '@/components/ui';
import { useAppStore } from '@/store/app-store';
import { AdvancedSettingsPanel } from '@/pages/dashboard/advanced-settings-panel';
import {
  Field,
  codexStateLabel,
  inputClassName,
  normalizeStartPageLabel,
  primaryButtonClassName,
  secondaryButtonClassName,
  sectionCardClassName,
  startPageOptions,
  themeOptions,
} from '@/pages/dashboard/shared';

export function SettingsPage({ onPageChange }: { onPageChange: (pageId: string) => void }) {
  const appState = useAppStore();
  const refreshCodexAuthStatus = useAppStore((state) => state.refreshCodexAuthStatus);
  const startCodexLogin = useAppStore((state) => state.startCodexLogin);
  const startCodexDeviceLogin = useAppStore((state) => state.startCodexDeviceLogin);
  const logoutCodex = useAppStore((state) => state.logoutCodex);
  const saveAppState = useAppStore((state) => state.saveAppState);
  const [settingsDraft, setSettingsDraft] = useState(appState.settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSettingsDraft({
      ...appState.settings,
      startPage: normalizeStartPageLabel(appState.settings.startPage),
    });
  }, [appState.settings]);

  async function onSaveSettings() {
    setSaving(true);
    try {
      await saveAppState({
        profile: appState.profile,
        dashboard: appState.dashboard,
        goals: appState.goals,
        plan: appState.plan,
        conversation: appState.conversation,
        reflection: appState.reflection,
        settings: settingsDraft,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card className="bg-[radial-gradient(circle_at_top_left,_rgba(191,219,254,0.36),_transparent_40%),linear-gradient(180deg,_rgba(255,255,255,0.96)_0%,_rgba(247,248,251,0.98)_100%)]">
        <Badge className="bg-white/90 text-slate-700">基础设置</Badge>
        <SectionTitle className="mt-4 text-3xl">把日常需要的控制项留在前面，技术噪音收进高级区</SectionTitle>
        <Muted className="mt-3 text-base leading-7">
          默认层只保留主题、启动页和 Codex 连接。运行时诊断、用途路由和观测性都收进高级设置里。
        </Muted>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[0.95fr,1.05fr]">
        <Card>
          <SectionTitle>基础偏好</SectionTitle>
          <div className="mt-5 grid gap-4">
            <Field label="主题">
              <select className={inputClassName} value={settingsDraft.theme} onChange={(event) => setSettingsDraft((current) => ({ ...current, theme: event.target.value }))}>
                {themeOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="启动页">
              <select className={inputClassName} value={settingsDraft.startPage} onChange={(event) => setSettingsDraft((current) => ({ ...current, startPage: event.target.value }))}>
                {startPageOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </Field>
          </div>
          <div className="mt-5 flex gap-3">
            <button type="button" className={primaryButtonClassName} onClick={() => void onSaveSettings()} disabled={saving}>
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              保存基础设置
            </button>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <SectionTitle>连接 Codex</SectionTitle>
              <Muted className="mt-2">采用官方 Codex 登录流。客户端只发起登录、检查状态和消费能力，不保存 ChatGPT OAuth token。</Muted>
            </div>
            <Badge className={appState.codexAuth.state === 'connected' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}>
              {codexStateLabel(appState.codexAuth.state)}
            </Badge>
          </div>
          <div className="mt-5 rounded-[1.4rem] bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
            {appState.codexAuth.message}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" className={primaryButtonClassName} onClick={() => void startCodexLogin()}>
              连接 Codex
            </button>
            <button type="button" className={secondaryButtonClassName} onClick={() => void refreshCodexAuthStatus()}>
              检查连接
            </button>
            <button type="button" className={secondaryButtonClassName} onClick={() => void logoutCodex()}>
              断开连接
            </button>
            <button type="button" className={secondaryButtonClassName} onClick={() => void startCodexDeviceLogin()}>
              设备码回退
            </button>
          </div>
        </Card>
      </div>

      <AdvancedSettingsPanel
        settingsDraft={settingsDraft}
        onSettingsDraftChange={setSettingsDraft}
        onSaveSettings={onSaveSettings}
        savingSettings={saving}
      />
    </div>
  );
}
