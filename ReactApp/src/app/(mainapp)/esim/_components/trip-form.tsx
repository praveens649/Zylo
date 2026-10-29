import { CalendarDays, MapPin, Plane, Search } from "lucide-react";
import type { TravelDestination } from "@/api/travel-esim.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatINR } from "@/lib/format";
import { countryFlag, countryName } from "../_lib/countries";

interface TripFormProps {
  destinations: TravelDestination[];
  country: string;
  departureDate: string;
  returnDate: string;
  isSearching?: boolean;
  onCountryChange: (country: string) => void;
  onDepartureChange: (date: string) => void;
  onReturnChange: (date: string) => void;
  onSearch: () => void;
}

function tripDays(departure: string, ret: string) {
  if (!departure || !ret) return null;
  const days = Math.round(
    (new Date(ret).getTime() - new Date(departure).getTime()) / 86_400_000
  );
  return days > 0 ? days : null;
}

export function TripForm({
  destinations,
  country,
  departureDate,
  returnDate,
  isSearching = false,
  onCountryChange,
  onDepartureChange,
  onReturnChange,
  onSearch,
}: TripFormProps) {
  const days = tripDays(departureDate, returnDate);
  const canSearch = !!country && !!departureDate && !!returnDate && !!days;

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-card to-card/60 shadow-sm">
      <div className="h-1.5 w-full bg-gradient-to-r from-primary to-primary/60" />
      <div className="p-5">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Plan your trip
          </h2>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label className="text-xs font-semibold text-muted-foreground">
              Destination
            </Label>
            <Select value={country} onValueChange={onCountryChange}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="Where are you travelling?" />
              </SelectTrigger>
              <SelectContent>
                {destinations.map((d) => (
                  <SelectItem key={d.country} value={d.country}>
                    <span className="flex items-center gap-2">
                      <span>{countryFlag(d.country)}</span>
                      <span>{countryName(d.country)}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {d.planCount} plan{d.planCount === 1 ? "" : "s"}
                        {d.fromPricePaise != null &&
                          ` • from ${formatINR(d.fromPricePaise / 100)}`}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">
              Departure
            </Label>
            <Input
              type="date"
              value={departureDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => onDepartureChange(e.target.value)}
              className="h-10 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">
              Return
            </Label>
            <Input
              type="date"
              value={returnDate}
              min={departureDate || new Date().toISOString().slice(0, 10)}
              onChange={(e) => onReturnChange(e.target.value)}
              className="h-10 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            {days ? (
              <span>
                Trip duration:{" "}
                <span className="font-bold text-foreground">
                  {days} day{days === 1 ? "" : "s"}
                </span>
              </span>
            ) : (
              "Pick your travel dates to see matching plans"
            )}
          </div>

          <Button
            onClick={onSearch}
            disabled={!canSearch || isSearching}
            className="h-10 px-5 font-bold shadow-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white"
          >
            {isSearching ? (
              <Plane className="h-4 w-4 mr-2 animate-pulse" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Search Plans
          </Button>
        </div>
      </div>
    </div>
  );
}
