import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCareerBestXI } from "@/lib/career/hooks";
import type { CareerBestElevenSlot } from "@/lib/career/types";

export function CareerBestXI() {
  const { seasonBestXI, careerBestXI } = useCareerBestXI();
  return (
    <Tabs defaultValue="season">
      <TabsList>
        <TabsTrigger value="season">Melhor XI da época</TabsTrigger>
        <TabsTrigger value="career">Melhor XI da carreira</TabsTrigger>
      </TabsList>
      <TabsContent value="season" className="mt-4">
        <BestXIPitch slots={seasonBestXI?.entries ?? []} />
      </TabsContent>
      <TabsContent value="career" className="mt-4">
        <BestXIPitch slots={careerBestXI?.entries ?? []} />
      </TabsContent>
    </Tabs>
  );
}

function BestXIPitch({ slots }: { slots: CareerBestElevenSlot[] }) {
  if (slots.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Melhor XI ainda não definido.
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardContent className="p-6">
        <div className="rounded-xl border border-gold/20 bg-gradient-to-b from-emerald-950/40 to-emerald-900/20 p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            {slots.map((s, i) => (
              <div
                key={`${s.position}-${i}`}
                className="rounded-lg bg-background/70 backdrop-blur border border-border/60 p-3 text-center"
              >
                <Badge variant="outline" className="text-[10px]">
                  {s.position}
                </Badge>
                <div className="text-sm font-display font-bold mt-1 truncate">{s.player}</div>
                <div className="text-xs text-muted-foreground truncate">{s.club}</div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
