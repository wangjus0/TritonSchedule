import { ChevronDown, Clock, User, Plus, Check, BookOpen, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Course } from "@/data/sampleCourses";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface CourseRowProps {
  course: Course;
  isAdded: boolean;
  onAddToCalendar: (course: Course) => void;
}

export function CourseRow({ course, isAdded, onAddToCalendar }: CourseRowProps) {
  const [isOpen, setIsOpen] = useState(false);

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
              
              {course.discussionTimes && (
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Discussions</p>
                    <p className="text-sm text-foreground">{course.discussionTimes}</p>
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
                onAddToCalendar(course);
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
