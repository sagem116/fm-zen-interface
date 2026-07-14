import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, UserRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCareer } from "@/lib/career/hooks";
import { setCareerAssociatedCoachIdu } from "@/lib/career";
import { fetchCareerCoachCandidates } from "@/lib/fm-db";

export function CareerCoachAssociation() {
  const { career } = useCareer();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(false);

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ["career-coach-candidates"],
    queryFn: fetchCareerCoachCandidates,
    staleTime: 60_000,
  });

  const linkedIdu = useMemo(() => {
    const meta = (career?.metadata ?? {}) as Record<string, unknown>;
    return typeof meta.associatedCoachIdu === "string" ? meta.associatedCoachIdu : null;
  }, [career]);

  const linkedCoach = useMemo(
    () =>
      linkedIdu ? (candidates.find((candidate) => candidate.idu === linkedIdu) ?? null) : null,
    [candidates, linkedIdu],
  );

  const missingLinkedCoach = Boolean(linkedIdu && !linkedCoach);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return candidates;
    return candidates.filter((candidate) => {
      const text = [candidate.name, candidate.club ?? "", candidate.country ?? ""]
        .join(" ")
        .toLowerCase();
      return text.includes(term);
    });
  }, [candidates, search]);

  const showPicker = editing || !linkedIdu || missingLinkedCoach;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base flex items-center gap-2">
          <UserRound className="size-4 text-primary" /> Associação do Treinador
        </CardTitle>
        {!showPicker && (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            Alterar Treinador
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {missingLinkedCoach && (
          <p className="text-muted-foreground">
            O treinador associado já não existe nos dados atuais. Selecione um novo treinador.
          </p>
        )}

        {!showPicker && linkedCoach && (
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <span className="text-muted-foreground">Nome:</span> {linkedCoach.name}
            </div>
            <div>
              <span className="text-muted-foreground">Clube atual:</span> {linkedCoach.club ?? "—"}
            </div>
            <div>
              <span className="text-muted-foreground">País:</span> {linkedCoach.country ?? "—"}
            </div>
            <div>
              <span className="text-muted-foreground">Cargo/Função:</span> {linkedCoach.role ?? "—"}
            </div>
            <div className="md:col-span-2">
              <span className="text-muted-foreground">Última atualização:</span>{" "}
              {linkedCoach.lastUpdated
                ? new Date(linkedCoach.lastUpdated).toLocaleString("pt-PT")
                : `Época ${linkedCoach.seasonYear}`}
            </div>
          </div>
        )}

        {showPicker && (
          <>
            <p className="text-muted-foreground">
              Pesquise treinadores importados por nome, clube ou país e associe a carreira através
              do IDU.
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Pesquisar treinador (nome, clube, país)"
                className="pl-9"
              />
            </div>

            {isLoading ? (
              <p className="text-muted-foreground">A carregar treinadores…</p>
            ) : filtered.length === 0 ? (
              <p className="text-muted-foreground">Sem treinadores correspondentes.</p>
            ) : (
              <div className="max-h-64 overflow-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-2 px-3">Nome</th>
                      <th className="py-2 px-3">Clube</th>
                      <th className="py-2 px-3">País</th>
                      <th className="py-2 px-3">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 80).map((candidate) => (
                      <tr key={candidate.idu} className="border-b border-border/40">
                        <td className="py-2 px-3">
                          <div className="font-medium">{candidate.name}</div>
                          <div className="text-xs text-muted-foreground">IDU: {candidate.idu}</div>
                        </td>
                        <td className="py-2 px-3">{candidate.club ?? "—"}</td>
                        <td className="py-2 px-3">{candidate.country ?? "—"}</td>
                        <td className="py-2 px-3">
                          <Button
                            size="sm"
                            onClick={() => {
                              if (!career) return;
                              setCareerAssociatedCoachIdu(candidate.idu, career.id);
                              setEditing(false);
                            }}
                          >
                            Selecionar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {linkedIdu && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Associação via IDU</Badge>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  Cancelar
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
