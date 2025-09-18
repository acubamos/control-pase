"use client";

import type React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import {
  Plus,
  History,
  QrCode,
  Camera,
  Edit,
  Trash2,
  Calendar,
  User,
  Car,
  MapPin,
  Clock,
  AlertCircle,
  LogOut,
} from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { UserMenu } from "@/components/user-menu";
import { HistoryView } from "@/components/history-view";
import { QRScanner } from "@/components/qr-scanner";
import { PhotoCapture } from "@/components/photo-capture";
import { authService } from "@/lib/auth-service";
import {
  apiService,
  type VehicleEntry,
  type CreateVehicleEntry,
} from "@/lib/api-services";
import type { QRData } from "@/lib/qr-scanner";

const VEHICLE_TYPES = [
  "Carro",
  "Moto",
  "Camión",
  "Camioneta",
  "Bus",
  "N/A",
];

const LOCATIONS = {
  "Entidades": ["Acubamos SURL", "Supergigantes", "Agencia de Paquetería", "Etecsa","Azumat OC", "Azumat UEB SG"],
};

// Función para obtener la hora actual de La Habana (UTC-5)
function getHavanaTime(): string {
  const now = new Date();
  // Ajustar a UTC-5 (La Habana)
  const havanaTime = new Date(now.getTime() - (5 * 60 * 60 * 1000));
  return havanaTime.toISOString().slice(0, 16);
}

// Función para formatear fecha y hora en formato 12h (AM/PM)
function formatDateTimeTo12h(dateString: string): string {
  const date = new Date(dateString);
  // Ajustar a UTC-5 (La Habana)
  const havanaDate = new Date(now.toLocaleString("en-US", {timeZone: "America/Havana"}));
  
  return havanaDate.toLocaleString("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}

// Función para obtener la hora actual de La Habana en formato 12h para mostrar
function getCurrentHavanaTime12h(): string {
  const now = new Date();
  // Ajustar a UTC-5 (La Habana)
  const havanaTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Havana"}));
  
  return havanaTime.toLocaleString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}

export default function VehicleEntrySystem() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<"main" | "history">("main");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>(getCurrentHavanaTime12h());

  // Estados del formulario
  const [formData, setFormData] = useState<CreateVehicleEntry>({
    nombre: "",
    apellidos: "",
    ci: "",
    tipoVehiculo: [],
    chapa: "",
    fechaEntrada: "",
    lugarDestino: {},
    fechaSalida: "",
  });

  // Estados de la aplicación
  const [entries, setEntries] = useState<VehicleEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEntry, setEditingEntry] = useState<VehicleEntry | null>(null);

  // Estados de modales
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [selectedEntryForPhoto, setSelectedEntryForPhoto] = useState<
    string | null
  >(null);
  const [photoBlobUrl, setPhotoBlobUrl] = useState<string | null>(null);

  // Actualizar la hora actual cada minuto
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentHavanaTime12h());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Verificar autenticación al cargar
  useEffect(() => {
    const checkAuth = () => {
      setIsAuthenticated(authService.isAuthenticated());
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  // Cargar entradas cuando se autentica
  useEffect(() => {
    if (isAuthenticated) {
      loadEntries();
    }
  }, [isAuthenticated]);

  // Establecer fecha de entrada automática al crear una nueva entrada
  useEffect(() => {
    if (!editingEntry) {
      setFormData((prev) => ({
        ...prev,
        fechaEntrada: getHavanaTime(),
      }));
    }
  }, [editingEntry]);

  const loadEntries = async () => {
    try {
      const data = await apiService.getEntries();
      // Mostrar solo las últimas 10 entradas en la vista principal
      setEntries(data.slice(0, 10));
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las entradas",
        variant: "destructive",
      });
    }
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentView("main");
    setCameraError(null);
  };

  const handleQRScan = (qrData: QRData) => {
    setFormData((prev) => ({
      ...prev,
      nombre: qrData.nombre,
      apellidos: qrData.apellidos,
      ci: qrData.ci,
    }));
    toast({
      title: "QR Escaneado",
      description: "Datos cargados desde el código QR",
    });
  };

  const handleVehicleTypeChange = (type: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      tipoVehiculo: checked
        ? [...prev.tipoVehiculo, type]
        : prev.tipoVehiculo.filter((t) => t !== type),
    }));
  };

  const handleLocationChange = (
    location: string,
    sublocation: string,
    checked: boolean
  ) => {
    setFormData((prev) => {
      const newDestino = { ...prev.lugarDestino };

      if (checked) {
        if (!newDestino[location]) {
          newDestino[location] = [];
        }
        if (!newDestino[location].includes(sublocation)) {
          newDestino[location].push(sublocation);
        }
      } else {
        if (newDestino[location]) {
          newDestino[location] = newDestino[location].filter(
            (s) => s !== sublocation
          );
          if (newDestino[location].length === 0) {
            delete newDestino[location];
          }
        }
      }

      return { ...prev, lugarDestino: newDestino };
    });
  };

  const resetForm = () => {
    setFormData({
      nombre: "",
      apellidos: "",
      ci: "",
      tipoVehiculo: [],
      chapa: "",
      fechaEntrada: getHavanaTime(),
      lugarDestino: {},
      fechaSalida: "",
    });
    setEditingEntry(null);
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (formData.tipoVehiculo.length === 0) {
        toast({
          title: "Validación",
          description: "Debe seleccionar al menos un tipo de vehículo.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const tieneDestino = Object.values(formData.lugarDestino).some(
        (sub) => sub.length > 0
      );
      if (!tieneDestino) {
        toast({
          title: "Validación",
          description: "Debe seleccionar al menos un lugar de destino.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      if (editingEntry) {
        await apiService.updateEntry(editingEntry.id, formData);
        toast({
          title: "Éxito",
          description: "Entrada actualizada correctamente",
        });
      } else {
        const entryData = {
          ...formData,
          fechaSalida: formData.fechaSalida || "",
        };
        await apiService.createEntry(entryData);
        toast({
          title: "Éxito",
          description: "Entrada registrada correctamente",
        });
      }

      resetForm();
      loadEntries();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Error al procesar la entrada",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (entry: VehicleEntry) => {
    setFormData({
      nombre: entry.nombre,
      apellidos: entry.apellidos,
      ci: entry.ci,
      tipoVehiculo: entry.tipoVehiculo,
      chapa: entry.chapa,
      fechaEntrada: entry.fechaEntrada,
      lugarDestino: entry.lugarDestino,
      fechaSalida: entry.fechaSalida || "",
    });
    setEditingEntry(entry);
  };

  const handleDeleteClick = (id: string) => {
    setEntryToDelete(id);
    setShowConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!entryToDelete) return;

    try {
      await apiService.deleteEntry(entryToDelete);
      setEntries((prevEntries) =>
        prevEntries.filter((entry) => entry.id !== entryToDelete)
      );
      loadEntries();
      setShowConfirmModal(false);
      setEntryToDelete(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al eliminar la entrada",
        variant: "destructive",
      });
      setShowConfirmModal(false);
      setEntryToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setShowConfirmModal(false);
    setEntryToDelete(null);
  };

  const handlePhotoCapture = (entryId: string) => {
    setSelectedEntryForPhoto(entryId);
    setShowPhotoCapture(true);
  };

  const handlePhotoUploaded = (photoUrl: string) => {
    loadEntries();
    setSelectedEntryForPhoto(null);
  };

  const handleCameraError = (error: string) => {
    setCameraError(error);
    toast({
      title: "Error de cámara",
      description: error,
      variant: "destructive",
    });
  };

  const formatDateTime = (dateString: string) => {
    return formatDateTimeTo12h(dateString);
  };

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

  const handleDownloadPhoto = () => {
    if (!photoBlobUrl) return;
    const a = document.createElement("a");
    a.href = photoBlobUrl;
    a.download = "foto.jpg";
    a.click();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  if (currentView === "history") {
    return (
      <HistoryView
        onBack={() => setCurrentView("main")}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Sistema de Gestión de Entradas
              </h1>             
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={() => setCurrentView("history")}
                variant="outline"
                size="sm"
              >
                <History className="h-4 w-4 mr-2" />
                Historial
              </Button>
              <UserMenu onLogout={handleLogout} />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulario de Entrada */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                {editingEntry ? "Editar Entrada" : "Nueva Entrada"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Datos Personales */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900">
                      Datos Personales
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="nombre">Nombre</Label>
                      <Input
                        id="nombre"
                        value={formData.nombre}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            nombre: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="apellidos">Apellidos</Label>
                      <Input
                        id="apellidos"
                        value={formData.apellidos}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            apellidos: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="ci">Cédula de Identidad</Label>
                    <Input
                      id="ci"
                      value={formData.ci}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, ci: e.target.value }))
                      }
                      required
                    />
                  </div>
                </div>

                <Separator />

                {/* Datos del Vehículo */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-900">
                    Datos del Vehículo
                  </h3>

                  <div>
                    <Label>Tipo de Vehículo</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {VEHICLE_TYPES.map((type) => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox
                            id={type}
                            checked={formData.tipoVehiculo.includes(type)}
                            onCheckedChange={(checked) =>
                              handleVehicleTypeChange(type, checked as boolean)
                            }
                          />
                          <Label htmlFor={type} className="text-sm">
                            {type}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="chapa">Chapa/Placa</Label>
                    <Input
                      id="chapa"
                      value={formData.chapa}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          chapa: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                </div>

                <Separator />

                {/* Destino */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-900">
                    Lugar de Destino
                  </h3>
                  {Object.entries(LOCATIONS).map(([location, sublocations]) => (
                    <div key={location} className="space-y-2">
                      <Label className="text-sm font-medium">{location}</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {sublocations.map((sublocation) => (
                          <div
                            key={sublocation}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`${location}-${sublocation}`}
                              checked={
                                formData.lugarDestino[location]?.includes(
                                  sublocation
                                ) || false
                              }
                              onCheckedChange={(checked) =>
                                handleLocationChange(
                                  location,
                                  sublocation,
                                  checked as boolean
                                )
                              }
                            />
                            <Label
                              htmlFor={`${location}-${sublocation}`}
                              className="text-sm"
                            >
                              {sublocation}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Fechas */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-900">Fechas</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fechaEntrada">Fecha de Entrada</Label>
                      <Input
                        id="fechaEntrada"
                        type="datetime-local"
                        value={formData.fechaEntrada}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            fechaEntrada: e.target.value,
                          }))
                        }
                        required
                        disabled
                      />                     
                    </div>
                    <div>                      
                    </div>
                  </div>
                </div>

                {/* Botones */}
                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting
                      ? "Procesando..."
                      : editingEntry
                      ? "Actualizar"
                      : "Registrar"}
                  </Button>
                  {editingEntry && (
                    <Button type="button" onClick={resetForm} variant="outline">
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Lista de Entradas Recientes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Entradas Recientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {entries.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No hay entradas registradas
                  </p>
                ) : (
                  entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex justify-between items-start">
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
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handlePhotoCapture(entry.id)}
                            variant="outline"
                            size="sm"
                            disabled={!!cameraError}
                            title={
                              cameraError
                                ? "Cámara no disponible"
                                : "Tomar foto"
                            }
                          >
                            <Camera className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleEdit(entry)}
                            variant="outline"
                            size="sm"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteClick(entry.id)}
                            variant="outline"
                            size="sm"
                          >
                            <Trash2 className="h-4 w-4" />
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
                        <span>
                          Entrada: {formatDateTime(entry.fechaEntrada)}
                        </span>
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

                      <div className="mt-2">
                        <img
                          src={entry.photoUrl || "/placeholder.svg"}
                          alt="Foto de la entrada"
                          className="w-16 h-16 object-cover rounded border cursor-pointer"
                          onClick={() => handleViewPhoto(entry.photoUrl)}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "/placeholder.svg";
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Confirmación de Eliminación */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar esta entrada? Esta acción no
              se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-start gap-2">
            <Button
              onClick={handleConfirmDelete}
              variant="destructive"
              className="flex-1"
            >
              Eliminar
            </Button>
            <Button
              onClick={handleCancelDelete}
              variant="outline"
              className="flex-1"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Modales */}
      <QRScanner
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScan={handleQRScan}
      />

      {selectedEntryForPhoto && (
        <PhotoCapture
          entryId={selectedEntryForPhoto}
          isOpen={showPhotoCapture}
          onClose={() => {
            setShowPhotoCapture(false);
            setSelectedEntryForPhoto(null);
          }}
          onPhotoUploaded={handlePhotoUploaded}
          onCameraError={handleCameraError}
        />
      )}

      <Toaster />
    </div>
  );
}
