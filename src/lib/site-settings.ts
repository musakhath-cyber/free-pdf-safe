import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

export type PublicSiteSettings = {
  adsEnabled: boolean;
  adsensePublisherId: string;
  adsenseSlotId: string;
  siteNotice: string;
  tagline: string;
};

export type AdminSiteState = PublicSiteSettings & {
  isOwner: boolean;
  canClaim: boolean;
  hasOwner: boolean;
};

type SettingsRow = {
  owner_user_id: string | null;
  ads_enabled: boolean | number | string;
  adsense_publisher_id: string;
  adsense_slot_id: string;
  site_notice: string;
  tagline: string;
};

const DEFAULT_TAGLINE = "Convert, sign, and scan. Files never leave this device.";

function asBool(value: boolean | number | string | null | undefined): boolean {
  return value === true || value === 1 || value === "1" || value === "t" || value === "true";
}

function toPublic(row: SettingsRow | undefined): PublicSiteSettings {
  return {
    adsEnabled: asBool(row?.ads_enabled),
    adsensePublisherId: row?.adsense_publisher_id ?? "",
    adsenseSlotId: row?.adsense_slot_id ?? "",
    siteNotice: row?.site_notice ?? "",
    tagline: row?.tagline || DEFAULT_TAGLINE,
  };
}

async function readRow(): Promise<SettingsRow | undefined> {
  const sql = await getSql();
  const rows = await sql<SettingsRow>`
    select owner_user_id, ads_enabled, adsense_publisher_id, adsense_slot_id, site_notice, tagline
    from site_settings
    where id = 1
  `;
  return rows[0];
}

async function loadAdminState(userId: string): Promise<AdminSiteState> {
  const row = await readRow();
  const ownerId = row?.owner_user_id ?? null;
  return {
    ...toPublic(row),
    hasOwner: Boolean(ownerId),
    isOwner: ownerId === userId,
    canClaim: !ownerId,
  };
}

export const getPublicSettings = createServerFn({ method: "GET" }).handler(async () => {
  return toPublic(await readRow());
});

export const getAdminState = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<AdminSiteState> => {
    return loadAdminState(context.userId);
  });

export const claimAdmin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<AdminSiteState> => {
    const sql = await getSql();
    await sql`
      update site_settings
      set owner_user_id = ${context.userId}, updated_at = now()
      where id = 1 and owner_user_id is null
    `;
    return loadAdminState(context.userId);
  });

type SaveInput = {
  adsEnabled: boolean;
  adsensePublisherId: string;
  adsenseSlotId: string;
  siteNotice: string;
  tagline: string;
};

function cleanSettings(input: SaveInput): SaveInput {
  return {
    adsEnabled: Boolean(input.adsEnabled),
    adsensePublisherId: input.adsensePublisherId.trim().slice(0, 80),
    adsenseSlotId: input.adsenseSlotId.trim().slice(0, 80),
    siteNotice: input.siteNotice.trim().slice(0, 280),
    tagline: input.tagline.trim().slice(0, 160) || DEFAULT_TAGLINE,
  };
}

export const saveSiteSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: SaveInput) => cleanSettings(input))
  .handler(async ({ context, data }): Promise<AdminSiteState> => {
    const sql = await getSql();
    const updated = await sql<{ owner_user_id: string | null }>`
      update site_settings
      set
        ads_enabled = ${data.adsEnabled},
        adsense_publisher_id = ${data.adsensePublisherId},
        adsense_slot_id = ${data.adsenseSlotId},
        site_notice = ${data.siteNotice},
        tagline = ${data.tagline},
        updated_at = now()
      where id = 1 and owner_user_id = ${context.userId}
      returning owner_user_id
    `;
    if (!updated[0]) {
      throw new Error("Only the studio owner can change these settings.");
    }
    return loadAdminState(context.userId);
  });
