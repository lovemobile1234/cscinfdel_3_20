import {AfterViewInit, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {PAGE_STATE} from '../../define/enums';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {MatDialog, MatPaginator} from '@angular/material';
import {ApiService} from '../../service/api.service';
import {CommonService} from '../../service/common.service';
import {NgxSpinnerService} from 'ngx-spinner';
import {ToastrService} from 'ngx-toastr';
import {catchError, debounceTime, distinctUntilChanged, finalize, tap} from 'rxjs/operators';
import {BehaviorSubject, fromEvent, Observable, of} from 'rxjs';
import {HttpErrorResponse} from '@angular/common/http';
import {DataSource} from '@angular/cdk/table';
import {CollectionViewer} from '@angular/cdk/collections';

@Component({
  selector: 'app-menu-rol',
  templateUrl: './menu-rol.component.html',
  styleUrls: ['./menu-rol.component.scss']
})
export class MenuRolComponent implements OnInit, AfterViewInit {

  pageData: any = {
    menuList: [],
    rolList: [],
  };


  state: PAGE_STATE = PAGE_STATE.SHOWING;
  PAGE_STATE: typeof PAGE_STATE = PAGE_STATE;


  createForm: FormGroup;
  editForm: FormGroup;

  selectedItem: any = undefined;

  @ViewChild('deleteConfirmDialog') deleteConfirmDialogTemplateRef;
  deleteConfirmDialogRef: any;

  displayedColumns: string[] = [
    'menucodigo',
    'rolcodigo',
    'ins',
    'upd',
    'del',
    'rea',
    'Actions',
  ];

  dataSource: MenuRolDataSource;
  @ViewChild('filter') filter: ElementRef;
  @ViewChild('paginator') paginator: MatPaginator;
  pageSizes = [10, 20, 50];

  constructor(
    public fb: FormBuilder,
    public apiService: ApiService,
    public common: CommonService,
    public spinner: NgxSpinnerService,
    public toastr: ToastrService,
    public dialog: MatDialog
  ) {
  }

  ngOnInit() {
    this.dataSource = new MenuRolDataSource(this.apiService, this.spinner);

    this.initForms();
  }

  ngAfterViewInit() {

    this.loadData();

    this.initPaginator();
    this.initFilter();
  }

  initForms() {

    const controlsConfig = {

      menucodigo: [null, Validators.compose([Validators.required])],
      rolcodigo: [null, Validators.compose([Validators.required])],
      ins: [null, Validators.compose([Validators.required])],
      upd: [null, Validators.compose([Validators.required])],
      del: [null, Validators.compose([Validators.required])],
      rea: [null, Validators.compose([Validators.required])],

    };

    this.createForm = this.fb.group(controlsConfig);

    this.editForm = this.fb.group(controlsConfig);
  }

  initPaginator() {
    this.paginator.page
      .pipe(
        tap(() => this.loadData())
      )
      .subscribe();
  }

  initFilter() {
    fromEvent(this.filter.nativeElement, 'keyup')
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => {
          this.paginator.pageIndex = 0;
          this.loadData(false);
        })
      )
      .subscribe();
  }

  startCreating() {

    this.selectedItem = {};

    this.loadRelatedData(() => {

      this.createForm.reset();
      this.createForm.markAsUntouched();

      this.state = PAGE_STATE.CREATING;
    });

  }

  create() {


    const params = this.createForm.value;

    params.id = {
      menucodigo: params.menucodigo,
      rolcodigo: params.rolcodigo
    };

    this.spinner.show();
    this.apiService.menuRol.create(params).subscribe(() => {
        this.spinner.hide();
        this.toastr.success('Creado existosamente');
        this.state = PAGE_STATE.SHOWING;
        this.loadData();
      },
      (err: HttpErrorResponse) => {
        console.log(err);
        this.spinner.hide();
        this.toastr.error('Ha ocurrido un error');
      });
  }

  startEditing(row) {

    this.loadRelatedData(() => {
      this.selectedItem = row;

      this.editForm.patchValue({

        menucodigo: this.selectedItem.id.menucodigo,
        rolcodigo: this.selectedItem.id.rolcodigo,
        ins: this.selectedItem.ins,
        upd: this.selectedItem.upd,
        del: this.selectedItem.del,
        rea: this.selectedItem.rea,

      });
      this.editForm.markAsUntouched();

      this.state = PAGE_STATE.EDITING;
    });


  }

  save() {

    const params = this.editForm.value;

    params.id = {
      menucodigo: params.menucodigo,
      rolcodigo: params.rolcodigo
    };

    this.spinner.show();
    this.apiService.menuRol.update(params).subscribe(() => {
        this.spinner.hide();
        this.toastr.success('Guardado exitoso');
        this.state = PAGE_STATE.SHOWING;
        this.loadData();
      },
      (err: HttpErrorResponse) => {
        console.log(err);
        this.spinner.hide();
        this.toastr.error('Ha ocurrido un error');
      });
  }

  deleteItem(row) {

    this.selectedItem = row;

    this.deleteConfirmDialogRef = this.dialog.open(this.deleteConfirmDialogTemplateRef, {
      width: '400px',
      disableClose: true
    });

  }

  onDeleteConfirmDialogYes() {
    this.deleteConfirmDialogRef.close();

    this.spinner.show();

    this.apiService.menuRol.delete(this.selectedItem).subscribe(
      () => {
        this.spinner.hide();
        this.toastr.success('Eliminado exitosamente');
        this.loadData();
      },
      (err: HttpErrorResponse) => {
        console.log(err);
        this.spinner.hide();
        this.toastr.error('Ha ocurrido un error');
      });
  }

  onDeleteConfirmDialogNo() {
    this.deleteConfirmDialogRef.close();
  }


  public loadData(showSpinner = true) {

    this.dataSource.loadData(
      this.paginator.pageIndex || 0,
      this.paginator.pageSize || this.pageSizes[0],
      this.filter.nativeElement.value,
      showSpinner);
  }

  public loadRelatedData(finishedCallback) {

    this.spinner.show();

    this.apiService.pageData.menuRol().subscribe(
      (response: any) => {
        this.spinner.hide();

        this.pageData = response;

        finishedCallback();

      },
      (err: HttpErrorResponse) => {
        console.log(err);
        this.spinner.hide();
        this.toastr.error('Ha ocurrido un error');
      });
  }

}


class MenuRolDataSource implements DataSource<any> {

  private dataSubject = new BehaviorSubject<any[]>([]);
  public totalCount;

  constructor(
    private apiService: ApiService,
    private spinner: NgxSpinnerService) {
  }

  connect(collectionViewer: CollectionViewer): Observable<any[] | ReadonlyArray<any>> {
    return this.dataSubject.asObservable();
  }

  disconnect(collectionViewer: CollectionViewer): void {
    this.dataSubject.complete();
  }

  loadData(pageIndex, pageSize, filter = '', showSpinner = true) {

    if (showSpinner) {
      this.spinner.show();
    }

    this.apiService.menuRol
      .getByPageAndFilter({
        pageNumber: pageIndex,

        pageSize: pageSize,
        filter: filter
      })
      .pipe(
        catchError(() => of({
          totalCount: 0,
          items: []
        })),
        finalize(() => this.spinner.hide())
      )
      .subscribe(data => {
        this.totalCount = data.totalCount;
        return this.dataSubject.next(data.items);
      });
  }

}
