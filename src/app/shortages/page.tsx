'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  MoreHorizontal,
  PlusCircle,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDataContext } from '@/lib/data-provider';
import { useFirestore } from '@/firebase';
import {
  collection,
  doc,
  writeBatch,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Shortage } from '@/lib/data';
import { startOfDay, endOfDay } from 'date-fns';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { STAFF_MEMBERS } from '@/lib/staff';

const shortageFormSchema = z.object({
  staffName: z.enum(STAFF_MEMBERS as [string, ...string[]], {
    required_error: "You need to select a staff member."
  }),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0.'),
});

type ShortageFormValues = z.infer<typeof shortageFormSchema>;

export default function ShortagesPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { shortages } = useDataContext();

  const form = useForm<ShortageFormValues>({
    resolver: zodResolver(shortageFormSchema),
  });

  const { todayStart, todayEnd } = React.useMemo(() => {
    const now = new Date();
    return {
      todayStart: startOfDay(now),
      todayEnd: endOfDay(now),
    };
  }, []);

  const todayShortages = React.useMemo(() => {
    if (!shortages) return [];
    return shortages.filter(shortage => {
      const shortageDate = shortage.shortageDate?.toDate ? shortage.shortageDate.toDate() : new Date(shortage.shortageDate);
      return shortageDate >= todayStart && shortageDate <= todayEnd;
    });
  }, [shortages, todayStart, todayEnd]);

  const onSubmit = async (data: ShortageFormValues) => {
    if (!firestore) return;

    const shortageRef = doc(collection(firestore, 'shortages'));

    const batch = writeBatch(firestore);

    batch.set(shortageRef, {
      id: shortageRef.id,
      staffName: data.staffName,
      amount: data.amount,
      shortageDate: serverTimestamp(),
    });

    try {
      await batch.commit();
      toast({
        title: 'Shortage Logged',
        description: `A new shortage has been successfully recorded.`,
      });
      form.reset();
    } catch(error: any) {
      toast({
        variant: "destructive",
        title: "Error Logging Shortage",
        description: error.message || "An unexpected error occurred."
      });
    }
  };

  const handleDeleteShortage = async (shortageId: string) => {
    if (!firestore) return;
    
    if (window.confirm('Are you sure you want to delete this shortage record?')) {
      const shortageRef = doc(firestore, 'shortages', shortageId);
      try {
        await deleteDoc(shortageRef);
        toast({
            title: 'Shortage Deleted',
            description: 'The shortage record has been removed.',
            variant: 'destructive',
          });
      } catch(error: any) {
         toast({
            variant: "destructive",
            title: "Error Deleting Shortage",
            description: error.message || "An unexpected error occurred."
        });
      }
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Log a New Shortage</CardTitle>
          <CardDescription>Select a staff member and enter the shortage amount.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="staffName"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Select Staff</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col sm:flex-row gap-4"
                      >
                        {STAFF_MEMBERS.map(staff => (
                            <FormItem key={staff} className='flex-1'>
                                <FormControl>
                                    <RadioGroupItem value={staff} id={staff} className='sr-only' />
                                </FormControl>
                                <Label 
                                    htmlFor={staff}
                                    className={`
                                        flex items-center justify-center p-4 rounded-md border-2 cursor-pointer
                                        ${field.value === staff ? 'border-primary bg-primary/10' : 'border-muted bg-transparent'}
                                        hover:border-primary/50 transition-colors
                                    `}
                                >
                                    {staff}
                                </Label>
                            </FormItem>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem className='w-full sm:max-w-xs'>
                    <FormLabel>Amount (₦)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="pt-2">
                 <Button type="submit">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Shortage
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Today's Shortages</CardTitle>
          <CardDescription>A list of all shortages recorded today.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Name</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[50px]"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {todayShortages.sort((a,b) => (b.shortageDate?.toMillis() ?? 0) - (a.shortageDate?.toMillis() ?? 0)).map((shortage) => (
                  <TableRow key={shortage.id}>
                    <TableCell className="font-medium whitespace-nowrap">{shortage.staffName}</TableCell>
                    <TableCell className="text-right">₦{shortage.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive hover:!text-destructive"
                            onSelect={(e) => {
                                e.preventDefault();
                                handleDeleteShortage(shortage.id);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
