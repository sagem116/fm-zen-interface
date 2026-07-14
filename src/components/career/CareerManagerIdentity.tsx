import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CareerDNA } from "./CareerDNA";
import { CareerPreferences } from "./CareerPreferences";

export function CareerManagerIdentity() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-display font-bold">Manager Identity</h2>
        <p className="text-sm text-muted-foreground">
          O ADN do treinador — filosofia, mercado, formação, estilo — e as preferências detetadas ao
          longo da carreira.
        </p>
      </div>
      <Tabs defaultValue="dna">
        <TabsList>
          <TabsTrigger value="dna">DNA</TabsTrigger>
          <TabsTrigger value="prefs">Preferências</TabsTrigger>
        </TabsList>
        <TabsContent value="dna" className="mt-4">
          <CareerDNA />
        </TabsContent>
        <TabsContent value="prefs" className="mt-4">
          <CareerPreferences />
        </TabsContent>
      </Tabs>
    </div>
  );
}
