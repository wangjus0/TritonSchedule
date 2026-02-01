import { ChevronDown, Clock, Users, Plus, Check, BookOpen, FileText, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Course, DiscussionSection } from "@/data/sampleCourses";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface CourseRowProps {
  course: Course;
  isAdded: boolean;
  onAddToCalendar: (course: Course, selectedDiscussion?: DiscussionSection) => void;
}

export function CourseRow({ course, isAdded, onAddToCalendar }: CourseRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDiscussionId, setSelectedDiscussionId] = useState<string | undefined>(
    course.discussionSections?.[0]?.id
  );

  const selectedDiscussion = course.discussionSections?.find(
    (d) => d.id === selectedDiscussionId
  );

  const hasDiscussions = course.discussionSections && course.discussionSections.length > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border border-border rounded-lg overflow-hidden bg-card transition-shadow hover:shadow-sm">
        <CollapsibleTrigger asChild>
          <button className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: course.color }}
              />
              <span className="text-sm text-muted-foreground shrink-0 w-40 truncate">
                {course.instructor}
              </span>
              <span className="font-medium text-foreground truncate">
                {course.name}
              </span>
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 text-muted-foreground shrink-0 transition-transform ml-4",
                isOpen && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-2 border-t border-border bg-muted/30">
            <p className="text-sm text-muted-foreground mb-4">
              {course.description}
            </p>
            
            <div className="grid gap-3 sm:grid-cols-2 mb-4">
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Lecture</p>
                  <p className="text-sm text-foreground">{course.schedule}</p>
                </div>
              </div>
              
              {hasDiscussions && (
                <div className="flex items-start gap-2">
                  <Users className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Discussion Section</p>
                    <Select value={selectedDiscussionId} onValueChange={setSelectedDiscussionId}>
                      <SelectTrigger className="h-8 text-sm bg-background">
                        <SelectValue placeholder="Select a section" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {course.discussionSections!.map((section) => (
                          <SelectItem key={section.id} value={section.id}>
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{section.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {section.time} • {section.location}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedDiscussion && (
                      <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {selectedDiscussion.location}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {course.midterm && (
                <div className="flex items-start gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Midterm</p>
                    <p className="text-sm text-foreground">{course.midterm}</p>
                  </div>
                </div>
              )}
              
              {course.final && (
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Final</p>
                    <p className="text-sm text-foreground">{course.final}</p>
                  </div>
                </div>
              )}
            </div>
            
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onAddToCalendar(course, selectedDiscussion);
              }}
              disabled={isAdded}
              size="sm"
              variant={isAdded ? "secondary" : "default"}
            >
              {isAdded ? (
                <>
                  <Check className="h-4 w-4" />
                  Added to Calendar
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add to Calendar
                </>
              )}
            </Button>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
