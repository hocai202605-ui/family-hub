import { Icon, IconName } from "./icons";

type ComingSoonModuleProps = {
  title: string;
  eyebrow: string;
  description: string;
  icon: IconName;
  ideas: string[];
};

export function ComingSoonModule({ title, eyebrow, description, icon, ideas }: ComingSoonModuleProps) {
  return (
    <div className="flex w-full flex-col gap-6 px-2.5 py-4 sm:py-5">
      <header className="rounded-lg border border-amber-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-700">{eyebrow}</p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal text-slate-950">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 ring-1 ring-inset ring-amber-100">
            <Icon className="h-4 w-4" name="sparkles" />
            Đang lên kế hoạch
          </span>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid h-14 w-14 place-items-center rounded-lg bg-[#fff7e8] text-amber-700">
            <Icon name={icon} />
          </div>
          <h2 className="mt-5 text-xl font-bold text-slate-950">Khu vực đang chuẩn bị</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Route này đã sẵn sàng trong sidebar để sau này thêm dữ liệu thật, bảng, form và biểu đồ riêng cho module.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Gợi ý phát triển</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {ideas.map((idea) => (
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-4" key={idea}>
                <p className="text-sm font-semibold leading-6 text-slate-700">{idea}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
