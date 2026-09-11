"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function cancelarReserva(listaId: string, reservaId: string) {
  const supabase = await createClient();
  await supabase.rpc("cancel_reservation", { p_reservation_id: reservaId });
  revalidatePath(`/listas/${listaId}/convidados`);
  revalidatePath(`/listas/${listaId}/presentes`);
}
