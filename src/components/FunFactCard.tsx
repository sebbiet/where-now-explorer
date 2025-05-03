
import React, { useState } from 'react';
import { Brain, ThumbsUp, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface FunFactProps {
  fact: string;
  isLoading: boolean;
  onVote?: (liked: boolean) => void;
  votes?: number;
  factId?: string;
}

// Sample data for additional facts - in a real app this would come from a database
const sampleAdditionalFacts = [
  { id: "1", fact: "Queensland is home to the Great Barrier Reef, the world's largest coral reef system!", votes: 15 },
  { id: "2", fact: "Did you know that kangaroos can't walk backwards? Their strong tails and powerful back legs make it impossible!", votes: 23 },
  { id: "3", fact: "Australian possums are different from American possums - they have fluffy tails and cute faces!", votes: 8 },
  { id: "4", fact: "Wombats have cube-shaped poop! Scientists think it helps the poop not roll away in the Australian desert.", votes: 42 },
  { id: "5", fact: "The Sydney Opera House has over one million roof tiles! That's a lot of cleaning!", votes: 12 }
];

// Sample top facts - in a real app this would come from a database
const topFacts = [
  { id: "6", fact: "Koalas sleep up to 22 hours a day! That's even more than your cat!", votes: 67 },
  { id: "7", fact: "Australia has over 750 species of reptiles, more than any other country in the world!", votes: 54 },
  { id: "8", fact: "In Australia, there are nearly twice as many kangaroos as humans!", votes: 48 },
  { id: "9", fact: "The Australian Alps get more snow than Switzerland! Surprising, right?", votes: 39 },
  { id: "10", fact: "Australia's Great Barrier Reef is visible from outer space!", votes: 35 }
];

const FunFactCard: React.FC<FunFactProps> = ({ fact, isLoading, onVote, votes = 0, factId = "current" }) => {
  const [hasVoted, setHasVoted] = useState(false);
  const [localVotes, setLocalVotes] = useState(votes);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const handleVote = () => {
    if (hasVoted) return;
    
    setHasVoted(true);
    setLocalVotes(prev => prev + 1);
    if (onVote) {
      onVote(true);
    }
    toast("Thanks for voting!", {
      description: "Your vote has been counted!",
      duration: 2000,
    });
  };
  
  return (
    <>
      <div className="bubble bg-gradient-to-br from-white to-soft-green dark:from-gray-800 dark:to-gray-700 w-full max-w-md mt-6">
        <div className="flex items-center mb-2">
          <Brain className="w-6 h-6 text-sky mr-2" />
          <h3 className="text-xl font-bold">Fun Fact!</h3>
        </div>
        
        {isLoading ? (
          <p className="text-lg animate-pulse-gentle">Loading a fun fact about this place...</p>
        ) : (
          <>
            <p className="text-lg mb-4">{fact}</p>
            
            <div className="flex justify-between items-center mt-4">
              <div className="flex items-center">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={`flex items-center gap-1 ${hasVoted ? 'bg-soft-purple text-grape' : ''}`}
                  onClick={handleVote}
                  disabled={hasVoted}
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span>{localVotes}</span>
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="ghost" 
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <History className="w-4 h-4" />
                  <span>History</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsModalOpen(true)}
                >
                  See More Facts
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
      
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center mb-4">Fun Facts Explorer</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="more">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="more">More Facts</TabsTrigger>
              <TabsTrigger value="top">Top Facts</TabsTrigger>
            </TabsList>
            
            <TabsContent value="more" className="space-y-4">
              {sampleAdditionalFacts.map(item => (
                <div key={item.id} className="p-4 border rounded-lg bg-white dark:bg-gray-800">
                  <p className="text-lg mb-2">{item.fact}</p>
                  <div className="flex justify-between items-center">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" />
                      <span>{item.votes}</span>
                    </Badge>
                  </div>
                </div>
              ))}
            </TabsContent>
            
            <TabsContent value="top" className="space-y-4">
              {topFacts.map((item, index) => (
                <div key={item.id} className="p-4 border rounded-lg bg-white dark:bg-gray-800">
                  <div className="flex gap-2 mb-2">
                    <Badge className={`${index < 3 ? 'bg-sunshine text-black' : ''}`}>#{index + 1}</Badge>
                    <p className="text-lg flex-1">{item.fact}</p>
                  </div>
                  <div className="flex justify-end">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" />
                      <span>{item.votes}</span>
                    </Badge>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FunFactCard;
