import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CareerMuseum } from "./CareerMuseum";
import { CareerJournal } from "./CareerJournal";
import { CareerTrophyRoom } from "./CareerTrophyRoom";
import { CareerAchievements } from "./CareerAchievements";

export function CareerMemories() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-display font-bold">Memórias</h2>
        <p className="text-sm text-muted-foreground">
          Museu, galeria, diário, troféus e conquistas — o arquivo emocional da carreira.
        </p>
      </div>
      <Tabs defaultValue="museu">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="museu">Museu</TabsTrigger>
          <TabsTrigger value="galeria">Galeria</TabsTrigger>
          <TabsTrigger value="diario">Diário</TabsTrigger>
          <TabsTrigger value="trofeus">Troféus</TabsTrigger>
          <TabsTrigger value="conquistas">Conquistas</TabsTrigger>
        </TabsList>
        <TabsContent value="museu" className="mt-4">
          <CareerMuseum />
        </TabsContent>
        <TabsContent value="galeria" className="mt-4">
          <CareerMuseum showGallery />
        </TabsContent>
        <TabsContent value="diario" className="mt-4">
          <CareerJournal />
        </TabsContent>
        <TabsContent value="trofeus" className="mt-4">
          <CareerTrophyRoom />
        </TabsContent>
        <TabsContent value="conquistas" className="mt-4">
          <CareerAchievements />
        </TabsContent>
      </Tabs>
    </div>
  );
}
