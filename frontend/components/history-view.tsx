"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Search,
  Filter,
  Trash2,
  Calendar,
  User,
  Car,
  MapPin,
  Clock,
  BarChart3,
  Users,
  TrendingUp,
  Camera,
  Eye,
  LogOut,
  Download,
} from "lucide-react";
import { UserMenu } from "@/components/user-menu";
import { ExportMenu } from "@/components/export-menu";
import { PhotoCapture } from "@/components/photo-capture";
import { apiService, type VehicleEntry } from "@/lib/api-services";
import { authService } from "@/lib/auth-service";

interface HistoryViewProps {
  onBack: () => void;
  onLogout: () => void;
}

export function HistoryView({ onBack, onLogout }: HistoryViewProps) {
  const [entries, setEntries] = useState<VehicleEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<VehicleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [selectedEntryForPhoto, setSelectedEntryForPhoto] = useState<
    string | null
  >(null);
  const [editingEntry, setEditingEntry] = useState<VehicleEntry | null>(null);

  // Nuevos estados para manejar la visualización y descarga de fotos
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [photoBlobUrl, setPhotoBlobUrl] = useState<string | null>(null);

  // Filtros
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    vehicleType: "all",
    location: "",
    hasExitDate: "all",
  });

  const user = authService.getCurrentUser();

  useEffect(() => {
    loadEntries();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [entries, searchTerm, filters]);

  const loadEntries = async () => {
    try {
      setIsLoading(true);
      const data = await apiService.getEntries();
      setEntries(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las entradas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = entries;

    // Filtro de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(
        (entry) =>
          entry.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.ci.includes(searchTerm) ||
          entry.chapa.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro de fecha desde
    if (filters.dateFrom) {
      filtered = filtered.filter(
        (entry) => new Date(entry.fechaEntrada) >= new Date(filters.dateFrom)
      );
    }

    // Filtro de fecha hasta
    if (filters.dateTo) {
      filtered = filtered.filter(
        (entry) =>
          new Date(entry.fechaEntrada) <= new Date(filters.dateTo + "T23:59:59")
      );
    }

    // Filtro de tipo de vehículo
    if (filters.vehicleType !== "all") {
      filtered = filtered.filter((entry) =>
        entry.tipoVehiculo.includes(filters.vehicleType)
      );
    }

    // Filtro de ubicación
    if (filters.location) {
      filtered = filtered.filter((entry) =>
        Object.keys(entry.lugarDestino).some((lugar) =>
          lugar.toLowerCase().includes(filters.location.toLowerCase())
        )
      );
    }

    // Filtro de fecha de salida
    if (filters.hasExitDate === "yes") {
      filtered = filtered.filter((entry) => entry.fechaSalida);
    } else if (filters.hasExitDate === "no") {
      filtered = filtered.filter((entry) => !entry.fechaSalida);
    }

    setFilteredEntries(filtered);
  };

  const handleSelectEntry = (entryId: string, checked: boolean) => {
    setSelectedEntries((prev) =>
      checked ? [...prev, entryId] : prev.filter((id) => id !== entryId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedEntries(checked ? filteredEntries.map((entry) => entry.id) : []);
  };

  const handleDeleteSelected = async () => {
    if (selectedEntries.length === 0) return;

    const confirmMessage = `¿Estás seguro de que quieres eliminar ${selectedEntries.length} entrada(s)?`;
    if (!confirm(confirmMessage)) return;

    try {
      await apiService.deleteMultipleEntries(selectedEntries);
      toast({
        title: "Éxito",
        description: `${selectedEntries.length} entrada(s) eliminada(s) correctamente`,
      });
      setSelectedEntries([]);
      loadEntries();
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al eliminar las entradas",
        variant: "destructive",
      });
    }
  };
  const handlePhotoCapture = (entryId: string) => {
    setSelectedEntryForPhoto(entryId);
    setShowPhotoCapture(true);
  };

  const handlePhotoUploaded = () => {
    loadEntries();
    setSelectedEntryForPhoto(null);
  };

  // Función para ver la foto en modal
  const handleViewPhoto = async (entryId: string) => {
    try {
      const blob = await apiService.getPhoto(entryId);
      const url = URL.createObjectURL(blob);
      setPhotoBlobUrl(url);
      setSelectedPhoto(url);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cargar la foto",
        variant: "destructive",
      });
    }
  };

  // Función para descargar la foto
  const handleDownloadPhoto = () => {
    if (!photoBlobUrl) return;
    const a = document.createElement("a");
    a.href = photoBlobUrl;
    a.download = "foto.jpg";
    a.click();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatistics = () => {
    const total = entries.length;
    const withExit = entries.filter((e) => e.fechaSalida).length;
    const withoutExit = total - withExit;
    const today = new Date().toDateString();
    const todayEntries = entries.filter(
      (e) => new Date(e.fechaEntrada).toDateString() === today
    ).length;

    return { total, withExit, withoutExit, todayEntries };
  };

  const stats = getStatistics();
  // Función para registrar la salida de un vehículo
  const handleRegisterExit = async (entryId: string) => {
    try {
      const exitTime = getHavanaTime();
      await apiService.updateEntry(entryId, { fechaSalida: exitTime });
      
      toast({
        title: "Éxito",
        description: "Salida registrada correctamente",
      });
      
      loadEntries();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar la salida",
        variant: "destructive",
      });
    }
  };
  function getHavanaTime(): string {
    const now = new Date();
    
    // Obtener la hora de La Habana correctamente
    const havanaTimeStr = now.toLocaleString("en-US", {
      timeZone: "America/Havana"
    });
    
    const havanaTime = new Date(havanaTimeStr);
    
    // Formatear manualmente para mantener la zona horaria
    const year = havanaTime.getFullYear();
    const month = String(havanaTime.getMonth() + 1).padStart(2, '0');
    const day = String(havanaTime.getDate()).padStart(2, '0');
    const hours = String(havanaTime.getHours()).padStart(2, '0');
    const minutes = String(havanaTime.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando historial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Button onClick={onBack} variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">
                Historial de Entradas
              </h1>
            </div>
            <UserMenu onLogout={onLogout} />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Total Entradas
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.total}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Con Salida
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.withExit}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Sin Salida
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.withoutExit}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Hoy</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.todayEntries}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controles */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Búsqueda */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar por nombre, CI o chapa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  variant="outline"
                  size="sm"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                </Button>
                {selectedEntries.length > 0 && (
                  <Button onClick={handleDeleteSelected} variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar ({selectedEntries.length})
                  </Button>
                )}
                <ExportMenu entries={filteredEntries} />
              </div>
            </div>

            {/* Panel de Filtros */}
            {showFilters && (
              <div className="mt-6 pt-6 border-t">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha Desde
                    </label>
                    <Input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          dateFrom: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha Hasta
                    </label>
                    <Input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          dateTo: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Vehículo
                    </label>
                    <Select
                      value={filters.vehicleType}
                      onValueChange={(value) =>
                        setFilters((prev) => ({ ...prev, vehicleType: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="Carro">Carro</SelectItem>
                        <SelectItem value="Moto">Moto</SelectItem>
                        <SelectItem value="Camión">Camión</SelectItem>
                        <SelectItem value="Camioneta">Camioneta</SelectItem>
                        <SelectItem value="Bus">Bus</SelectItem>
                        <SelectItem value="Bicicleta">N/A</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ubicación
                    </label>
                    <Input
                      placeholder="Filtrar por ubicación"
                      value={filters.location}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          location: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estado de Salida
                    </label>
                    <Select
                      value={filters.hasExitDate}
                      onValueChange={(value) =>
                        setFilters((prev) => ({ ...prev, hasExitDate: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="yes">Con salida</SelectItem>
                        <SelectItem value="no">Sin salida</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={() =>
                      setFilters({
                        dateFrom: "",
                        dateTo: "",
                        vehicleType: "all",
                        location: "",
                        hasExitDate: "all",
                      })
                    }
                    variant="outline"
                    size="sm"
                  >
                    Limpiar Filtros
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lista de Entradas */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Entradas ({filteredEntries.length})</CardTitle>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={
                    selectedEntries.length === filteredEntries.length &&
                    filteredEntries.length > 0
                  }
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-gray-600">Seleccionar todo</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredEntries.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No se encontraron entradas con los filtros aplicados
                </p>
              ) : (
                filteredEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedEntries.includes(entry.id)}
                          onCheckedChange={(checked) =>
                            handleSelectEntry(entry.id, checked as boolean)
                          }
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">
                              {entry.nombre} {entry.apellidos}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>CI: {entry.ci}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handlePhotoCapture(entry.id)}
                          variant="outline"
                          size="sm"
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-gray-500" />
                      <div className="flex gap-1">
                        {entry.tipoVehiculo.map((tipo) => (
                          <Badge
                            key={tipo}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tipo}
                          </Badge>
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">
                        - {entry.chapa}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(entry.lugarDestino).map(
                          ([lugar, sublugares]) =>
                            sublugares.map((sublugar) => (
                              <Badge
                                key={`${lugar}-${sublugar}`}
                                variant="outline"
                                className="text-xs"
                              >
                                {lugar} - {sublugar}
                              </Badge>
                            ))
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>Entrada: {formatDateTime(entry.fechaEntrada)}</span>
                      {entry.fechaSalida && (
                        <span>
                          • Salida: {formatDateTime(entry.fechaSalida)}
                        </span>
                      )}
                    </div>

                    {/* Botón para registrar salida */}
                    {!entry.fechaSalida && (
                        <div className="pt-2">
                          <Button
                            onClick={() => handleRegisterExit(entry.id)}
                            variant="outline"
                            size="sm"
                            className="w-full"
                          >
                            <LogOut className="h-4 w-4 mr-2" />
                            Registrar Salida
                          </Button>
                        </div>
                      )}

                    {entry.photoUrl && (
                      <div className="mt-2 flex items-center gap-2">
                        {/* <img
                          src={entry.photoUrl || "/placeholder.svg"}
                          alt="Foto de la entrada"
                          className="w-16 h-16 object-cover rounded border cursor-pointer"
                          onClick={() => handleViewPhoto(entry.photoUrl)}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "/placeholder.svg";
                          }}
                        /> */}
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewPhoto(entry.photoUrl ?? "")}
                            title="Ver foto"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de ver foto en grande */}
      <Dialog
        open={!!selectedPhoto}
        onOpenChange={() => setSelectedPhoto(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vista de Foto</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            <img
              src={selectedPhoto || "/placeholder.svg"}
              alt="Vista ampliada"
              className="max-h-[70vh] object-contain rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.svg";
              }}
            />
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleDownloadPhoto}
              disabled={!photoBlobUrl}
            >
              Descargar
            </Button>
            <Button variant="outline" onClick={() => setSelectedPhoto(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Captura de Foto */}
      {/* {selectedEntryForPhoto && (
        <PhotoCapture
          entryId={selectedEntryForPhoto}
          isOpen={showPhotoCapture}
          onClose={() => {
            setShowPhotoCapture(false)
            setSelectedEntryForPhoto(null)
          }}
          onPhotoUploaded={handlePhotoUploaded}
        />
      )} */}
    </div>
  );
}
